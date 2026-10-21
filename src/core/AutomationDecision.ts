/**
 * v2rayDP Desktop - Pure Functional Automation Decision Engine
 *
 * Implements the SSID -> Profile Rules Engine:
 * - Master ON/OFF toggle.
 * - Current network detection & normalization.
 * - Ordered specific SSID rules evaluation (first match wins, case-insensitive).
 * - "Do not connect" rule support.
 * - Disabled rules: excluded from fallback ("Any other Wi-Fi") and automation does nothing.
 * - Built-in "Any other Wi-Fi" fallback with its own ON/OFF toggle switch.
 * - Direct Wi-Fi A -> Wi-Fi B switching (restarts/switches with matched profile).
 * - Disconnect & leaving policies (STOP_VPN vs KEEP_VPN).
 * - Auto-reconnect when returning to an approved network.
 * - Manual override protection (both manual disconnect suppression and manual connect profile preservation).
 */

import { AutomationSettings, WifiStatus, ConnectionStatus } from './types';

export interface DecisionInput {
  settings: AutomationSettings;
  wifiStatus: WifiStatus;
  currentConnectionStatus: ConnectionStatus;
  isVpnRunning: boolean;
  runningProfileId?: string | null;
  autoRetryCount?: number;
  source?: string;
}

export type DecisionAction =
  | { type: 'NO_OP'; reason: string }
  | { type: 'START_VPN'; profileId: string; reason: string }
  | { type: 'SWITCH_VPN'; profileId: string; reason: string }
  | { type: 'STOP_VPN'; reason: string };

export interface DecisionResult {
  action: DecisionAction;
  updatedSettings: AutomationSettings;
  statusMessage: string;
  logMessage?: string;
  logLevel?: 'INFO' | 'WARN' | 'ERROR' | 'AUTO';
}

export class AutomationDecision {
  /**
   * Pure evaluation function:
   * Input: (settings, wifiStatus, currentConnectionStatus, isVpnRunning, runningProfileId)
   * Output: Action + updatedSettings + status message
   */
  static evaluate(input: DecisionInput): DecisionResult {
    const {
      settings,
      wifiStatus,
      currentConnectionStatus,
      isVpnRunning,
      runningProfileId = null,
      autoRetryCount = 0,
      source = 'poll'
    } = input;

    // 1. Master toggle check
    if (!settings.isAutomationGloballyEnabled) {
      return {
        action: { type: 'NO_OP', reason: 'Automation is globally disabled' },
        updatedSettings: settings,
        statusMessage: 'Automation is disabled'
      };
    }

    // 2. Guard during connecting state
    if (currentConnectionStatus === 'connecting') {
      return {
        action: { type: 'NO_OP', reason: 'Service is currently connecting' },
        updatedSettings: settings,
        statusMessage: 'Connecting…'
      };
    }

    // 3. Compute current network key
    const currentCleanSsid = this.cleanSsid(wifiStatus.ssid);
    const currentNetworkKey = wifiStatus.connected
      ? (currentCleanSsid ? `WIFI:${currentCleanSsid}` : 'WIFI:<unknown>')
      : 'NONE:none';

    let updatedSettings: AutomationSettings = { ...settings };

    // 4. Retry guard on error
    if (currentConnectionStatus === 'error' && autoRetryCount >= 2 && source !== 'force') {
      return {
        action: { type: 'NO_OP', reason: 'Max auto-retries reached (2/2) for this network' },
        updatedSettings,
        statusMessage: 'Automatic retries exhausted for this network (2/2 attempts failed)',
        logMessage: `Auto-retries exhausted on ${currentNetworkKey}`,
        logLevel: 'WARN'
      };
    }

    // 5. Manual Disconnect Override handling
    if (settings.manualOverrideSuppressed) {
      if (
        settings.manualOverrideNetworkKey &&
        settings.manualOverrideNetworkKey === currentNetworkKey &&
        source !== 'force'
      ) {
        return {
          action: { type: 'NO_OP', reason: 'Paused by manual stop on this network' },
          updatedSettings,
          statusMessage: 'Paused by manual stop (this network)',
          logMessage: `Automation paused by manual stop on ${currentNetworkKey}`,
          logLevel: 'INFO'
        };
      } else {
        // Physical network changed -> clear manual disconnect override!
        updatedSettings.manualOverrideSuppressed = false;
        updatedSettings.manualOverrideReason = '';
        updatedSettings.manualOverrideNetworkKey = null;
      }
    }

    // 6. Manual Connect Preservation:
    // If the user manually connected with a profile on this network, automation must not change that profile
    if (
      settings.manualConnectedProfileId &&
      settings.manualConnectedNetworkKey &&
      settings.manualConnectedNetworkKey === currentNetworkKey &&
      source !== 'force'
    ) {
      return {
        action: { type: 'NO_OP', reason: 'Preserving user manually chosen profile on this network' },
        updatedSettings,
        statusMessage: 'Preserving manual connection (this network)'
      };
    } else if (
      settings.manualConnectedNetworkKey &&
      settings.manualConnectedNetworkKey !== currentNetworkKey
    ) {
      // Physical network changed -> clear manual connect preservation
      updatedSettings.manualConnectedProfileId = null;
      updatedSettings.manualConnectedNetworkKey = null;
    }

    // 7. Case: Wi-Fi Disconnected / Turned Off
    if (!wifiStatus.connected) {
      if (isVpnRunning) {
        if (settings.autoStopOnWifiOff || settings.autoStopOnWifiLeave) {
          if (settings.wifiLeavePolicy === 'STOP_VPN') {
            updatedSettings.stoppedByLeaveWifiSsid = currentCleanSsid;
            return {
              action: { type: 'STOP_VPN', reason: 'Wi-Fi disconnected -> Auto-stopping VPN' },
              updatedSettings,
              statusMessage: 'Wi-Fi disconnected -> Stopped VPN',
              logMessage: 'Wi-Fi disconnected. Stopped VPN service.',
              logLevel: 'AUTO'
            };
          } else {
            return {
              action: { type: 'NO_OP', reason: 'Left Wi-Fi but keeping VPN running per policy' },
              updatedSettings,
              statusMessage: 'Wi-Fi disconnected (VPN kept running)'
            };
          }
        } else {
          return {
            action: { type: 'NO_OP', reason: 'Wi-Fi disconnected but auto-stop is disabled' },
            updatedSettings,
            statusMessage: 'Wi-Fi disconnected (VPN kept running)'
          };
        }
      } else {
        return {
          action: { type: 'NO_OP', reason: 'Wi-Fi disconnected and VPN is not running' },
          updatedSettings,
          statusMessage: 'Wi-Fi disconnected'
        };
      }
    }

    // 8. Case: Wi-Fi Connected
    // Auto-reconnect on return check
    if (
      settings.stoppedByLeaveWifiSsid &&
      currentCleanSsid &&
      settings.stoppedByLeaveWifiSsid.toLowerCase() === currentCleanSsid.toLowerCase()
    ) {
      if (!settings.autoReconnectOnWifiReturn) {
        return {
          action: { type: 'NO_OP', reason: 'Auto-reconnect on return is OFF' },
          updatedSettings,
          statusMessage: `Wi-Fi (${currentCleanSsid}) returned, but auto-reconnect on return is OFF`
        };
      } else {
        updatedSettings.stoppedByLeaveWifiSsid = null;
      }
    }

    // Step A: Evaluate enabled specific SSID rules in order (first match wins, case-insensitive)
    if (currentCleanSsid) {
      const matchedRule = settings.rules.find(
        (r) => r.enabled && r.ssid.trim().toLowerCase() === currentCleanSsid.toLowerCase()
      );

      if (matchedRule) {
        // Enabled specific rule found for this SSID!
        if (matchedRule.action === 'connect') {
          const targetProfileId = matchedRule.profileId;
          if (!targetProfileId) {
            return {
              action: { type: 'NO_OP', reason: `Rule matched for "${matchedRule.ssid}" but no profile selected` },
              updatedSettings,
              statusMessage: `Matched "${matchedRule.ssid}", but no profile is assigned`,
              logMessage: `Rule for "${matchedRule.ssid}" has no profile assigned`,
              logLevel: 'WARN'
            };
          }

          if (!isVpnRunning) {
            return {
              action: {
                type: 'START_VPN',
                profileId: targetProfileId,
                reason: `Matched rule for "${matchedRule.ssid}"`
              },
              updatedSettings,
              statusMessage: `Connected to Wi-Fi (${currentCleanSsid}) -> Auto-starting VPN`,
              logMessage: `Auto-connecting VPN with profile assigned to "${matchedRule.ssid}"`,
              logLevel: 'AUTO'
            };
          } else {
            // VPN is already running
            if (runningProfileId === targetProfileId) {
              return {
                action: { type: 'NO_OP', reason: `VPN already running with profile for "${matchedRule.ssid}"` },
                updatedSettings,
                statusMessage: `VPN active on ${currentCleanSsid}`
              };
            } else {
              // Different profile running -> switch profile!
              return {
                action: {
                  type: 'SWITCH_VPN',
                  profileId: targetProfileId,
                  reason: `Switched network to "${matchedRule.ssid}" -> Reconnecting with assigned profile`
                },
                updatedSettings,
                statusMessage: `Switched to ${currentCleanSsid} -> Reconnecting with assigned profile`,
                logMessage: `Network switch to "${matchedRule.ssid}". Reconnecting with profile ID: ${targetProfileId}`,
                logLevel: 'AUTO'
              };
            }
          }
        } else {
          // Action is "do_not_connect"
          if (isVpnRunning) {
            return {
              action: {
                type: 'STOP_VPN',
                reason: `Matched "Do not connect" rule for "${matchedRule.ssid}"`
              },
              updatedSettings,
              statusMessage: `Connected to ${currentCleanSsid} ("Do not connect" rule) -> Stopped VPN`,
              logMessage: `Stopping VPN per "Do not connect" rule on "${matchedRule.ssid}"`,
              logLevel: 'AUTO'
            };
          } else {
            return {
              action: { type: 'NO_OP', reason: `Matched "Do not connect" rule for "${matchedRule.ssid}"` },
              updatedSettings,
              statusMessage: `Connected to ${currentCleanSsid} (Rule: Do not connect)`
            };
          }
        }
      }
    }

    // Step B: No specific SSID rule matched (or SSID cannot be read/unknown)
    // Fall back to built-in "Any other Wi-Fi" rule
    const fallback = settings.fallbackRule;

    if (!fallback.enabled) {
      // Explicit requirement: "If this switch is OFF, VPN will NEVER auto-connect on networks that have no specific rule."
      return {
        action: { type: 'NO_OP', reason: 'No specific rule matched, and "Any other Wi-Fi" is OFF' },
        updatedSettings,
        statusMessage: currentCleanSsid
          ? `Connected to ${currentCleanSsid} ("Any other Wi-Fi" fallback is OFF)`
          : 'Connected to Wi-Fi ("Any other Wi-Fi" fallback is OFF)'
      };
    }

    // Fallback switch is ON
    if (fallback.action === 'connect') {
      const targetProfileId = fallback.profileId;
      if (!targetProfileId) {
        return {
          action: { type: 'NO_OP', reason: '"Any other Wi-Fi" enabled but no fallback profile configured' },
          updatedSettings,
          statusMessage: 'No profile configured for "Any other Wi-Fi" fallback',
          logLevel: 'WARN'
        };
      }

      if (!isVpnRunning) {
        return {
          action: {
            type: 'START_VPN',
            profileId: targetProfileId,
            reason: 'Auto-connecting via "Any other Wi-Fi" fallback rule'
          },
          updatedSettings,
          statusMessage: `Connected to Wi-Fi (${currentCleanSsid || 'Any other Wi-Fi'}) -> Auto-starting VPN`,
          logMessage: `Auto-connecting via "Any other Wi-Fi" fallback rule on ${currentCleanSsid || 'network'}`,
          logLevel: 'AUTO'
        };
      } else {
        if (runningProfileId === targetProfileId) {
          return {
            action: { type: 'NO_OP', reason: 'VPN already running with fallback profile' },
            updatedSettings,
            statusMessage: `VPN active on ${currentCleanSsid || 'Wi-Fi'}`
          };
        } else {
          return {
            action: {
              type: 'SWITCH_VPN',
              profileId: targetProfileId,
              reason: 'Reconnecting with fallback profile'
            },
            updatedSettings,
            statusMessage: `Network changed -> Reconnecting with fallback profile`,
            logMessage: `Reconnecting with fallback profile for ${currentCleanSsid || 'network'}`,
            logLevel: 'AUTO'
          };
        }
      }
    } else {
      // Fallback action is "do_not_connect"
      if (isVpnRunning) {
        return {
          action: {
            type: 'STOP_VPN',
            reason: '"Any other Wi-Fi" rule set to "Do not connect"'
          },
          updatedSettings,
          statusMessage: `Connected to ${currentCleanSsid || 'Wi-Fi'} (Fallback: Do not connect) -> Stopped VPN`,
          logMessage: 'Stopping VPN per "Any other Wi-Fi" Do-not-connect rule',
          logLevel: 'AUTO'
        };
      } else {
        return {
          action: { type: 'NO_OP', reason: '"Any other Wi-Fi" rule set to "Do not connect"' },
          updatedSettings,
          statusMessage: `Connected to ${currentCleanSsid || 'Wi-Fi'} (Fallback: Do not connect)`
        };
      }
    }
  }

  static cleanSsid(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let s = raw.trim();
    if (s === '<unknown ssid>' || s === '"<unknown ssid>"' || s === '') {
      return null;
    }
    if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
      s = s.substring(1, s.length - 1);
    }
    return s.trim() || null;
  }
}

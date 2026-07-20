const retryData = await retryResponse.json();
        apiResponseCache = retryData;
        return processVipteamResponse(retryData, prevPin, vpKey, attempt);
      }
      
      const data = await response.json();
      DBG.log('VPLINK', 'Response data received');
      apiResponseCache = data;
      return processVipteamResponse(data, pin, vpKey, attempt);
      
    } catch (error) {
      DBG.error('VPLINK', 'Error: ' + error.message);
      queueLog('❌', `ERROR: ${error.message}`, '#ff4757', 'log-error');
      
      if (attempt < maxRetries) {
        DBG.log('VPLINK', `Retrying after error (${attempt + 1}/${maxRetries})...`);
        queueLog('⏳', `RETRYING (${attempt + 1}/${maxRetries})...`, '#ffa500');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchVipteamRedirectUrl(type, vpKey, attempt + 1);
      }
      
      DBG.error('VPLINK', `All ${maxRetries} attempts exhausted`);
      queueLog('❌', `ALL ${maxRetries} ATTEMPTS EXHAUSTED`, '#ff4757', 'log-error');
      return handleFetchFailure('❌ SERVER REJECTED AFTER MAX ATTEMPTS');
    }
  }

  // Credit: Abdullah Al Mamun (@ff_jod_2x)
  function processVipteamResponse(data, pin, vpKey, attempt) {
    const maxRetries = 3;
    const destinationUrl = data.destinationLink || CONFIG.fallbackRedirectUrl;
    
    DBG.log('VIPTEAM', 'Processing response, destination: ' + (destinationUrl || 'N/A').substring(0, 60));
    
    queueLog('📋', 'PARSING VIPTEAM RESPONSE...', '#ff00ff', 'log-highlight');
    queueLog('●', `VERIFIED: ${data.verified ? '✅ YES' : '❌ NO'}`, data.verified ? '#2ecc71' : '#ff4757');
    queueLog('●', `VP KEY MATCH: ${data.keyMatch ? '✅ MATCHED' : '⚠ UNVERIFIED'}`, data.keyMatch ? '#2ecc71' : '#ffa500');
    
    if (data.destinationLink) {
      const truncated = data.destinationLink.length > 50 ? data.destinationLink.substring(0, 50) + '...' : data.destinationLink;
      queueLog('🔗', `DESTINATION: ${truncated}`, '#4a5568');
    }
    
    if (isTelegramLink(destinationUrl)) {
      DBG.log('VIPTEAM', 'Fake URL (Telegram link) detected in VIP module');
      queueLog('⚠', `FAKE LINK BYPASS TRIGGERED (Attempt ${attempt}/${maxRetries})`, '#ffa500', 'log-highlight');
      
      if (attempt < maxRetries) {
        queueLog('🔄', `RETRACTING TARGET... Attempt ${attempt + 1} of ${maxRetries}`, '#ffa500', 'log-highlight');
        return fetchVipteamRedirectUrl(data.type || 'vp', vpKey, attempt + 1);
      }
      
      return handleFetchFailure('❌ SERVER REJECTED — FAKE LINKS DETECTED');
    } 
    else if (isValidRedirectUrl(destinationUrl)) {
      DBG.log('VIPTEAM', 'Valid VIP link verified successfully.');
      return handleFetchSuccess(destinationUrl, data, pin);
    } 
    else {
      return handleFetchFailure('❌ INVALID VIP DESTINATION FORMAT');
    }
  }

  // ═══════════════════ ADDITIONAL PANELS ═══════════════════
  // Credit: Abdullah Al Mamun (@ff_jod_2x)
  function renderExploitPanelForPowerCheats(apiType) {
    selectedTargetName = "POWERCHEATS";
    selectedModuleType = "powercheats";
    renderExploitPanel(apiType);
  }

  // Credit: Abdullah Al Mamun (@ff_jod_2x)
  function renderUniversalVplinkPanel(apiType) {
    selectedTargetName = "UNIVERSAL VPLINK.IN";
    selectedModuleType = "universal-vplink";
    renderExploitPanel(apiType);
  }

  // ═══════════════════ CORE INITIALIZATION ═══════════════════
  // Credit: Abdullah Al Mamun (@ff_jod_2x)
  async function initNebula() {
    DBG.log('INIT', 'Starting Core Boot Engine...');
    injectStyles();
    
    const isMetered = isMeteredConnection();
    if (isMetered) {
      musicAutoPlay = false;
      DBG.log('INIT', 'Metered data protocol enforced: Auto-music disabled.');
    }

    await fetchConfig();
    await fetchMusicList();
    
    const userLoaded = await fetchUserData();
    if (!userLoaded) {
      DBG.log('INIT', 'Using local default user profile stub');
    }

    if (isBannedUser()) {
      showBanPanel();
      return;
    }
    
    if (isSuspendedUser()) {
      showSuspendedPanel();
      return;
    }

    if (CONFIG.status === 0) {
      showMaintenance();
      return;
    } else if (CONFIG.status === 2) {
      showOutdated();
      return;
    }

    renderInitPanel();
  }

  // Start the application lifecycle execution loop
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initNebula();
  } else {
    window.addEventListener("DOMContentLoaded", initNebula);
  }

})();

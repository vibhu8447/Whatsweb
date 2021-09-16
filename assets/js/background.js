chrome.runtime.onInstalled.addListener((reason) => {
  chrome.tabs.create({
    url: "https://web.whatsapp.com",
  });
  chrome.runtime.setUninstallURL("https://eazybe.com/feedback");
});
chrome.runtime.onMessage.addListener((message, sender) => {
  chrome.run;
  chrome.runtime.setUninstallURL(message);
});

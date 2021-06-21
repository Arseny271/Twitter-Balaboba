let settingsJson = localStorage.getItem("settings");
if (settingsJson === null) {
  settingsJson = JSON.stringify({
    needHighlight: true,
    active: true});
  localStorage.setItem("settings", settingsJson);
}

let tabsList = []

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const {type} = request;

  if (type === "saveSettings") {
    localStorage.setItem("settings", JSON.stringify(request.settings));
  }

  if (type === "getSettings") {
    const settings = JSON.parse(localStorage.getItem("settings"));
    sendResponse(settings)
  }
});

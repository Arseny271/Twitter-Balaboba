const checkbox_0 = document.getElementById("checkbox-0")
const checkbox_1 = document.getElementById("checkbox-1")

function saveSettings() {
  chrome.runtime.sendMessage({
    type: "saveSettings",
    settings: {
      active: checkbox_0.checked,
      needHighlight: checkbox_1.checked
    }
  })
}

async function readSettings() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "getSettings"
    }, answer => resolve(answer))
  })
}

checkbox_0.addEventListener("change", (event) => {
  saveSettings()
})

checkbox_1.addEventListener("change", (event) => {
  saveSettings()
})

readSettings().then(answer => {
  if (answer) {
    checkbox_0.checked = answer.active;
    checkbox_1.checked = answer.needHighlight;
  } else {
    checkbox_0.checked = true
    checkbox_1.checked = true
  }
});

const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

function reportColorScheme() {
    chrome.runtime.sendMessage({
        type: "themeChanged",
        isDark: colorScheme.matches
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Não foi possível enviar a preferência de tema:", chrome.runtime.lastError);
        }
    });
}

reportColorScheme();

if (colorScheme.addEventListener) {
    colorScheme.addEventListener("change", reportColorScheme);
} else {
    colorScheme.addListener(reportColorScheme);
}

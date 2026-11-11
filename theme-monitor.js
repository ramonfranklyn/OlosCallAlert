const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");

function reportColorScheme() {
    chrome.runtime.sendMessage({
        type: "themeChanged",
        isDark: colorScheme.matches
    }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
            console.error(
                "Não foi possível enviar a preferência de tema:",
                error.message || JSON.stringify(error)
            );
        }
    });
}

reportColorScheme();

if (colorScheme.addEventListener) {
    colorScheme.addEventListener("change", reportColorScheme);
} else {
    colorScheme.addListener(reportColorScheme);
}

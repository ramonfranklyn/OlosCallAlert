// Recebe mensagens do content script e coordena ações fora da página do Olos.
chrome.runtime.onMessage.addListener((message, sender) => {

    // Trata o alerta de uma nova chamada recebida.
    if (message.type === "incomingCall") {

        // Mostra uma notificação do sistema operacional.
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Nova Ligação",
            message: "Você possui uma chamada receptiva no Olos."
        });

        // Procura todas as abas abertas para localizar o Olos.
        chrome.tabs.query({}, (tabs) => {

            // Seleciona a primeira aba pertencente ao sistema Olos.
            const olosTab = tabs.find(tab =>
                tab.url &&
                tab.url.includes("bbts.oloschannel.com.br")
            );

            // Não há ação de foco se o Olos não estiver aberto.
            if (!olosTab) {
                return;
            }

            // Ativa a aba do Olos.
            chrome.tabs.update(olosTab.id, {
                active: true
            });

            // Coloca a janela do Olos em primeiro plano.
            chrome.windows.update(
                olosTab.windowId,
                {
                    focused: true
                }
            );

        });

        return;
    }

    // Encaminha um comando de parada para a aba ativa.
    if (message.type === "stopRingtone") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Obtém a aba atualmente ativa na janela do navegador.
            const tab = tabs[0];

            // Encerra se não houver uma aba ativa disponível.
            if (!tab) {
                return;
            }

            // Pede ao content script que pare o áudio e o alerta visual.
            chrome.tabs.sendMessage(tab.id, {
                type: "stopRingtone"
            });
        });
    }

});

// Usa o clique no ícone da extensão como interrupção manual do ring.
chrome.action.onClicked.addListener((tab) => {
    // Ignora cliques sem uma aba válida associada.
    if (!tab || !tab.id) {
        return;
    }

    // Envia o comando de parada diretamente para a aba clicada.
    chrome.tabs.sendMessage(tab.id, {
        type: "stopRingtone"
    });
});

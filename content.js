// Indica se uma chamada foi confirmada e está sendo acompanhada.
let callActive = false;
// Guarda o intervalo responsável por alternar o título da página.
let blinkInterval = null;
// Mantém a instância do áudio enquanto o ring estiver tocando.
let ringtone = null;
// Guarda o temporizador que limita a duração do ring.
let ringtoneTimer = null;
// Evita disparar o mesmo alerta várias vezes para a mesma chamada.
let confirmedCall = false;

// Duração máxima do alerta sonoro, em milissegundos.
const RING_DURATION_MS = 6000;
// Intervalo curto para reduzir o tempo de resposta quando o DOM não muda.
const CALL_POLL_INTERVAL_MS = 100;

// Título original da página, usado para restaurá-lo após o alerta.
const originalTitle = document.title;
const isLocalTestPage = ["localhost", "127.0.0.1"].includes(location.hostname);

function updateTestStatus(attribute, value) {
    if (isLocalTestPage) {
        document.documentElement.dataset[attribute] = value;
    }
}

// Calcula quantos sinais visuais de chamada estão presentes na página.
function callScore() {

    // Começa a pontuação sem sinais detectados.
    let score = 0;

    // Verifica o texto que identifica uma chamada receptiva.
    if (
        document.body.innerText.includes(
            "Chamada Receptiva"
        )
    ) {
        score++;
    }

    // Verifica o indicador visual de ocupado do Olos.
    if (
        document.querySelector(
            ".Chip.--busy"
        )
    ) {
        score++;
    }

    // Verifica se a seção de dados da ligação está visível.
    if (
        document.body.innerText.includes(
            "Dados da Ligação"
        )
    ) {
        score++;
    }

    // Verifica se algum elemento forte informa que a chamada está falando.
    const talking = [
        ...document.querySelectorAll("strong")
    ].some(el =>
        el.textContent.trim()
            .toUpperCase() === "FALANDO"
    );

    if (talking) {
        score++;
    }

    // Retorna a quantidade de sinais encontrados.
    return score;
}

// Considera a chamada detectada quando pelo menos dois sinais estão presentes.
function callDetected() {
    return callScore() >= 2;
}

// Inicia a alternância do título para destacar visualmente a chamada.
function startBlink() {

    // Evita criar vários intervalos para o mesmo alerta.
    if (blinkInterval) {
        return;
    }

    // Alterna entre o título original e o título de nova ligação a cada segundo.
    blinkInterval = setInterval(() => {

        document.title =
            document.title === "☎ NOVA LIGAÇÃO"
                ? originalTitle
                : "☎ NOVA LIGAÇÃO";

    }, 1000);
}

// Interrompe a alternância do título e restaura o título original.
function stopBlink() {

    // Não há nada para interromper se o alerta visual não estiver ativo.
    if (!blinkInterval) {
        return;
    }

    clearInterval(blinkInterval);

    blinkInterval = null;

    document.title = originalTitle;
}

// Prepara o áudio antes da chegada da chamada para evitar o carregamento no disparo.
function prepareRingtone() {

    if (ringtone) {
        return;
    }

    ringtone = new Audio(
        chrome.runtime.getURL("ring.mp3")
    );

    ringtone.preload = "auto";
    ringtone.loop = true;
    ringtone.volume = 0.6;
    ringtone.load();
}

// Inicia o áudio do ring já pré-carregado.
function playRingtone() {

    // Impede a criação de mais de um áudio ao mesmo tempo.
    if (ringtone && !ringtone.paused) {
        return;
    }

    prepareRingtone();
    ringtone.currentTime = 0;

    // Inicia a reprodução e registra falhas de autoplay ou carregamento.
    ringtone.play()
        .then(() => updateTestStatus("olosCallAlertAudio", "playing"))
        .catch((error) => {
            updateTestStatus(
                "olosCallAlertAudio",
                error.name === "NotAllowedError" ? "blocked" : "error"
            );
            console.error(error);
        });

    // Encerra o alerta após o tempo máximo configurado.
    ringtoneTimer = setTimeout(() => {
        stopRingtone();
    }, RING_DURATION_MS);
}

// Para o áudio e libera os recursos associados ao ring.
function stopRingtone() {

    // Cancela o limite de tempo quando o ring termina antes dos 6 segundos.
    if (ringtoneTimer) {
        clearTimeout(ringtoneTimer);
        ringtoneTimer = null;
    }

    // Não há áudio ativo para interromper.
    if (!ringtone) {
        return;
    }

    // Pausa o áudio e volta para o início, preservando o pré-carregamento.
    ringtone.pause();
    ringtone.currentTime = 0;
    updateTestStatus("olosCallAlertAudio", "stopped");
}

// Reúne as ações executadas quando uma nova chamada é confirmada.
function incomingCall() {

    // Solicita ao service worker a notificação e o foco na aba do Olos.
    chrome.runtime.sendMessage({
        type: "incomingCall"
    });

    // Inicia o alerta sonoro.
    playRingtone();

    // Inicia o alerta visual no título da página.
    startBlink();
}

// Encerra todos os alertas associados à chamada atual.
function callFinished() {

    stopRingtone();

    stopBlink();
}

// Recebe comandos enviados pelo ícone da extensão ou pelo service worker.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Ignora mensagens que não sejam comandos para parar o ring.
    if (message.type !== "stopRingtone") {
        return;
    }

    // Interrompe o áudio e o alerta visual imediatamente.
    callFinished();
});

// Verifica o estado da chamada e controla o início e o fim dos alertas.
function monitor() {

    // Lê os sinais atuais exibidos na interface do Olos.
    const detected = callDetected();

    if (detected) {

        // Dispara o alerta somente uma vez por chamada confirmada.
        if (!confirmedCall) {
            confirmedCall = true;
            callActive = true;

            incomingCall();
        }

    } else {

        // Permite que uma próxima chamada gere um novo alerta.
        confirmedCall = false;

        // Finaliza os alertas quando a chamada deixa de ser detectada.
        if (callActive) {

            callActive = false;

            callFinished();
        }
    }
}

// Pré-carrega o áudio para que a chamada não aguarde a criação do elemento.
updateTestStatus("olosCallAlert", "ready");
prepareRingtone();

// Executa uma verificação periódica mesmo quando a página não sofre alterações.
setInterval(monitor, CALL_POLL_INTERVAL_MS);

// Observa mudanças no DOM para reagir rapidamente à confirmação da chamada.
const observer = new MutationObserver(() => {
    monitor();
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});

// Exibe a pontuação no console para facilitar testes e diagnóstico.
setInterval(() => {
    console.log(
        "Score:",
        callScore()
    );
}, 1000);
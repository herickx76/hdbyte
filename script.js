// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =================================================================
// ⚙️ CONFIGURAÇÃO (COLE SUAS CHAVES DA NOVA CONTA AQUI)
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCxdXJiVA0ZJclCrpFgPAcU7CfE8ErXeAo",
  authDomain: "sys-gestor-c6571.firebaseapp.com",
  projectId: "sys-gestor-c6571",
  storageBucket: "sys-gestor-c6571.firebasestorage.app",
  messagingSenderId: "634332258432",
  appId: "1:634332258432:web:0fe9b4bcb128e566dc4665",
  measurementId: "G-831837W39V"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Variáveis Globais de Controle
let dbRef;      // Referência do banco
let userPath;   // String do caminho (ex: 'bot_manager/herick')

// --- LOGIN ---
const telaLogin = document.getElementById('tela-login');
const sistemaPrincipal = document.getElementById('sistema-principal');
const formLogin = document.getElementById('form-login');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0];
        userPath = `bot_manager/${username}`;
        dbRef = ref(db, userPath);
        
        telaLogin.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        document.getElementById('usuario-logado').innerText = username.toUpperCase();
        
        carregarClientes();
    } else {
        telaLogin.style.display = 'flex';
        sistemaPrincipal.style.display = 'none';
    }
});

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
        const senha = document.getElementById('login-senha').value.trim();
        signInWithEmailAndPassword(auth, `${usuario}@hdbyte.com`, senha)
            .catch(() => alert("Login inválido"));
    });
}

window.fazerLogout = () => signOut(auth);

// --- LÓGICA DE INTERFACE DINÂMICA (INPUTS DE PARCELAS) ---
window.toggleForm = () => {
    const f = document.getElementById('form-cliente');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

// Gera os inputs baseados na quantidade escolhida
window.gerarCamposParcelas = () => {
    const qtd = parseInt(document.getElementById('qtd-parcelas').value) || 1;
    const valBase = document.getElementById('valor-base').value || "";
    const container = document.getElementById('container-inputs-parcelas');
    
    container.innerHTML = ''; // Limpa anteriores

    for(let i = 1; i <= qtd; i++) {
        const div = document.createElement('div');
        div.className = 'input-parcela-wrapper';
        div.innerHTML = `
            <label>Mês ${i}</label>
            <input type="number" step="0.01" class="input-valor-mes" data-mes="${i}" value="${valBase}">
        `;
        container.appendChild(div);
    }
};

// Inicializa com 1 campo
if(document.getElementById('qtd-parcelas')) window.gerarCamposParcelas();


// --- LÓGICA DO DATABASE ---
const formCliente = document.getElementById('form-cliente');
const listaClientes = document.getElementById('lista-clientes');

function carregarClientes() {
    onValue(dbRef, (snapshot) => {
        listaClientes.innerHTML = '';
        let somaRecebido = 0;
        let somaPendente = 0;

        const data = snapshot.val();
        if (data) {
            // Converte objeto em array e ordena
            const clientes = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            clientes.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

            clientes.forEach(c => {
                // Renderiza HTML
                renderizarLinha(c);

                // Calcula totais
                if(c.parcelas) {
                    c.parcelas.forEach(p => {
                        if(p.pago) somaRecebido += parseFloat(p.valor);
                        else somaPendente += parseFloat(p.valor);
                    });
                }
            });
        }
        document.getElementById('total-recebido').innerText = `R$ ${somaRecebido.toFixed(2)}`;
        document.getElementById('total-pendente').innerText = `R$ ${somaPendente.toFixed(2)}`;
    });
}

function renderizarLinha(c) {
    const tr = document.createElement('tr');
    
    // Calcula progresso (Ex: 2/12 Pagos)
    const totalP = c.parcelas ? c.parcelas.length : 0;
    const pagos = c.parcelas ? c.parcelas.filter(p => p.pago).length : 0;
    const porcentagem = totalP > 0 ? Math.round((pagos / totalP) * 100) : 0;
    
    // Cria as bolinhas interativas
    let htmlBolinhas = '<div class="grid-pagamentos">';
    if(c.parcelas) {
        c.parcelas.forEach((p, index) => {
            const classeStatus = p.pago ? 'pago' : 'pendente';
            const statusTexto = p.pago ? 'Pago!' : 'Aguardando Pagamento';
            
            // Note que passamos o INDEX para saber qual mês atualizar
            htmlBolinhas += `
                <div class="ball-parcela ${classeStatus}" 
                     title="Mês ${p.numero}: R$ ${p.valor} - ${statusTexto}"
                     onclick="window.toggleParcela('${c.id}', ${index}, ${p.pago})">
                     ${p.numero}
                </div>`;
        });
    }
    htmlBolinhas += '</div>';

    tr.innerHTML = `
        <td data-label="Início">${c.dataInicio.split('-').reverse().join('/')}</td>
        <td data-label="Cliente" style="color:#fff; font-weight:bold;">${c.cliente}</td>
        <td data-label="Plano">${c.plano}</td>
        <td data-label="Progresso" style="color:var(--neon-blue);">${pagos}/${totalP} (${porcentagem}%)</td>
        <td data-label="Parcelas">${htmlBolinhas}</td>
        <td data-label="Ações">
            <button onclick="window.excluirCliente('${c.id}')" class="btn-logout" style="border-color:#555;"><i class="fas fa-trash"></i></button>
        </td>
    `;
    listaClientes.appendChild(tr);
}

// --- SALVAR NOVO CLIENTE ---
if(formCliente) {
    formCliente.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Coleta os valores individuais dos inputs gerados
        const inputsValores = document.querySelectorAll('.input-valor-mes');
        let arrayParcelas = [];
        
        inputsValores.forEach(input => {
            arrayParcelas.push({
                numero: parseInt(input.dataset.mes),
                valor: parseFloat(input.value) || 0,
                pago: false // Começa sempre como não pago
            });
        });

        const novoCliente = {
            cliente: document.getElementById('cliente').value,
            plano: document.getElementById('plano').value,
            dataInicio: document.getElementById('data-inicio').value,
            parcelas: arrayParcelas // Array complexo salvo no banco
        };

        push(dbRef, novoCliente);
        alert("Contrato Gerado!");
        formCliente.reset();
        window.gerarCamposParcelas(); // Reseta os inputs
        window.toggleForm(); // Fecha o form no mobile
    });
}

// --- AÇÕES ---

// Alternar status de UMA parcela específica
window.toggleParcela = (id, indexParcela, statusAtual) => {
    // Caminho exato: bot_manager/usuario/ID_CLIENTE/parcelas/INDEX/pago
    const pathParcela = `${userPath}/${id}/parcelas/${indexParcela}`;
    
    // Inverte o status
    update(ref(db, pathParcela), { pago: !statusAtual });
};

window.excluirCliente = (id) => {
    if(confirm("Excluir contrato?")) {
        remove(ref(db, `${userPath}/${id}`));
    }
};

window.filtrarTabela = () => {
    const termo = document.getElementById('busca').value.toLowerCase();
    const linhas = document.querySelectorAll('#lista-clientes tr');
    linhas.forEach(l => {
        l.style.display = l.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
};
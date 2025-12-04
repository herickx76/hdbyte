// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =================================================================
// ⚙️ CONFIGURAÇÃO (COLE SUAS CHAVES DA NOVA CONTA AQUI)
// =================================================================
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://SEU_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Variáveis Globais de Controle
let dbRef;      // Referência do banco
let userPath;   // String do caminho (ex: 'bot_manager/herick')

// =================================================================
// 🔐 AUTENTICAÇÃO E ROTEAMENTO DE DADOS
// =================================================================
const telaLogin = document.getElementById('tela-login');
const sistemaPrincipal = document.getElementById('sistema-principal');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('msg-erro');
const tituloUsuario = document.getElementById('usuario-logado');

// OUVINTE DE LOGIN: Aqui acontece a mágica da separação
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Pega o nome antes do @ (ex: 'herick' ou 'reysson')
        const username = user.email.split('@')[0];
        
        // --- DEFINE A PASTA DO BANCO PARA ESTE USUÁRIO ---
        userPath = `bot_manager/${username}`;
        dbRef = ref(db, userPath);
        
        // Atualiza Interface
        telaLogin.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        tituloUsuario.innerText = username.toUpperCase(); // Mostra HERICK ou REYSSON
        
        // Carrega APENAS os dados dessa pasta
        carregarClientes();
    } else {
        telaLogin.style.display = 'flex';
        sistemaPrincipal.style.display = 'none';
    }
});

// FUNÇÃO DE LOGIN
if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuarioInput = document.getElementById('login-usuario').value.trim().toLowerCase();
        const senha = document.getElementById('login-senha').value.trim();
        
        // Define o domínio fixo
        const emailCompleto = `${usuarioInput}@hdbyte.com`; 

        signInWithEmailAndPassword(auth, emailCompleto, senha)
            .then(() => {
                msgErro.style.display = 'none';
            })
            .catch((error) => {
                console.error(error);
                msgErro.style.display = 'block';
                msgErro.innerText = "USUÁRIO OU SENHA INVÁLIDOS";
                document.querySelector('.login-card').style.borderColor = '#fff';
                setTimeout(() => document.querySelector('.login-card').style.borderColor = 'var(--neon-red)', 200);
            });
    });
}

window.fazerLogout = () => signOut(auth);

// =================================================================
// 🧠 LÓGICA DO GERENCIADOR (ISOLADO)
// =================================================================
const formCliente = document.getElementById('form-cliente');
const listaClientes = document.getElementById('lista-clientes');
const hoje = new Date();

// Define data padrão no input
if(document.getElementById('data-inicio')) {
    document.getElementById('data-inicio').value = hoje.toISOString().split('T')[0];
}

function carregarClientes() {
    // Escuta apenas o dbRef definido no login (pasta do usuário)
    onValue(dbRef, (snapshot) => {
        listaClientes.innerHTML = '';
        let totalRendaMes = 0;
        let totalClientes = 0;
        
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const data = snapshot.val();
        
        // Array auxiliar para ordenar
        let clientesArray = [];

        if (data) {
            Object.keys(data).forEach(key => {
                clientesArray.push({ id: key, ...data[key] });
            });

            // Ordenar: Pendentes primeiro, depois data mais recente
            clientesArray.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

            clientesArray.forEach(cliente => {
                renderizarLinha(cliente);
                totalClientes++;

                // Cálculo Financeiro (Apenas Pagos do Mês Atual)
                const dataCliente = new Date(cliente.dataInicio);
                // Ajuste de fuso horário simples para garantir mês correto
                const dataAdjusted = new Date(dataCliente.getTime() + dataCliente.getTimezoneOffset() * 60000);

                if(cliente.pagamento === 'pago' && dataAdjusted.getMonth() === mesAtual && dataAdjusted.getFullYear() === anoAtual) {
                    totalRendaMes += parseFloat(cliente.valor);
                }
            });
        }
        
        document.getElementById('total-clientes').innerText = totalClientes;
        document.getElementById('rendimento-mes').innerText = `R$ ${totalRendaMes.toFixed(2).replace('.', ',')}`;
    });
}

function renderizarLinha(c) {
    const tr = document.createElement('tr');
    
    // Cálculo de dias corridos
    const dataInicio = new Date(c.dataInicio);
    const diffTime = Math.abs(hoje - dataInicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Formatação
    const dataFormatada = c.dataInicio.split('-').reverse().join('/');
    const badgeClass = c.pagamento === 'pago' ? 'badge-pago' : 'badge-pendente';
    const statusTexto = c.pagamento === 'pago' ? 'PAGO' : 'PENDENTE';

    tr.innerHTML = `
        <td style="color:var(--neon-blue); font-family: monospace;">${dataFormatada}</td>
        <td style="font-weight:bold; color:#fff;">${c.nome}</td>
        <td>${c.plano}</td>
        <td><span class="dias-uso">${diffDays} dias</span></td>
        <td>
            <span class="badge ${badgeClass}" 
                  onclick="window.alternarPagamento('${c.id}', '${c.pagamento}')" 
                  style="cursor:pointer; user-select:none;">
                  ${statusTexto}
            </span>
        </td>
        <td>R$ ${parseFloat(c.valor).toFixed(2).replace('.', ',')}</td>
        <td>
            <button onclick="window.excluirCliente('${c.id}')" class="btn-acao btn-trash" title="Remover">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    listaClientes.appendChild(tr);
}

// CADASTRAR NOVO CLIENTE
if(formCliente) {
    formCliente.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Salva na referência do usuário logado
        push(dbRef, {
            nome: document.getElementById('cliente').value,
            plano: document.getElementById('plano').value,
            dataInicio: document.getElementById('data-inicio').value,
            valor: document.getElementById('valor').value,
            pagamento: document.getElementById('status-pagamento').value
        });

        alert("Cliente Adicionado com Sucesso!");
        formCliente.reset();
        document.getElementById('data-inicio').value = new Date().toISOString().split('T')[0];
    });
}

// AÇÕES GLOBAIS (Usam userPath para segurança)

window.excluirCliente = (id) => {
    if(confirm("Tem certeza que deseja apagar este registro?")) {
        // Remove especificamente da pasta do usuário logado
        remove(ref(db, `${userPath}/${id}`));
    }
};

window.alternarPagamento = (id, statusAtual) => {
    const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
    // Atualiza especificamente na pasta do usuário logado
    update(ref(db, `${userPath}/${id}`), { pagamento: novoStatus });
};

// BUSCA / FILTRO VISUAL
window.filtrarTabela = () => {
    const termo = document.getElementById('busca').value.toLowerCase();
    const linhas = document.querySelectorAll('#lista-clientes tr');
    
    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? '' : 'none';
    });
};
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

// === VARIÁVEIS GLOBAIS ===
let dbRef;
let dbRefCustos; 
let userPath;

// === TABELA DE PREÇOS (AUTO-PREENCHIMENTO) ===
const PLANOS_INFO = {
    "basico": { nome: "Bot Básico (0% IA)", instalacao: 70, mensal: 70 }, // Ajuste instalação conforme sua estratégia
    "essencial": { nome: "Bot IA Essencial", instalacao: 300, mensal: 120 },
    "profissional": { nome: "Bot IA Profissional", instalacao: 400, mensal: 180 },
    "premium": { nome: "Bot IA Elite + DB", instalacao: 500, mensal: 250 }
};

// =================================================================
// 🔐 LOGIN (ALTERADO PARA ESCONDER LANDING PAGE)
// =================================================================
const landingPage = document.getElementById('landing-page'); // A página inteira de vendas
const sistemaPrincipal = document.getElementById('sistema-principal');
const formLogin = document.getElementById('form-login');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- USUÁRIO LOGADO ---
        const username = user.email.split('@')[0];
        userPath = `bot_manager/${username}`;
        
        dbRef = ref(db, `${userPath}/clientes`);
        dbRefCustos = ref(db, `${userPath}/custos`);
        
        // Esconde a Landing Page e mostra o Painel
        landingPage.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        
        document.getElementById('usuario-logado').innerText = username.toUpperCase();
        carregarDadosCompletos();
    } else {
        // --- USUÁRIO DESLOGADO ---
        landingPage.style.display = 'block';
        sistemaPrincipal.style.display = 'none';
    }
});

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
        const senha = document.getElementById('login-senha').value.trim();
        
        signInWithEmailAndPassword(auth, `${usuario}@hdbyte.com`, senha)
            .catch((error) => {
                const msg = document.getElementById('msg-erro');
                msg.style.display = 'block';
                // Efeito visual de erro
                document.querySelector('.login-container-box').style.borderColor = '#fff';
                setTimeout(() => document.querySelector('.login-container-box').style.borderColor = '#333', 200);
            });
    });
}
window.fazerLogout = () => signOut(auth);

// =================================================================
// 🤖 AUTO-PREENCHIMENTO DE PLANOS
// =================================================================
window.autoPreencherPlano = () => {
    const selecao = document.getElementById('select-modelo-plano').value;
    const checkHospedagem = document.getElementById('check-hospedagem').checked;
    
    if (selecao && PLANOS_INFO[selecao]) {
        const p = PLANOS_INFO[selecao];
        
        document.getElementById('plano').value = p.nome;
        
        // Lógica de Instalação
        document.getElementById('check-taxa').checked = true;
        window.toggleInputTaxa();
        document.getElementById('valor-taxa').value = p.instalacao;
        
        // Lógica Mensalidade
        let valorMensalFinal = p.mensal;
        if (checkHospedagem) valorMensalFinal += 20;
        
        document.getElementById('valor-base').value = valorMensalFinal;
        window.gerarCamposParcelas();
    }
};

// =================================================================
// 🧠 RESTANTE DA LÓGICA (MANTIDA IGUAL AO PASSO ANTERIOR)
// =================================================================
window.toggleForm = (idForm) => {
    const f = document.getElementById(idForm);
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

window.toggleInputTaxa = () => {
    const chk = document.getElementById('check-taxa');
    document.getElementById('container-valor-taxa').style.display = chk.checked ? 'block' : 'none';
};

window.gerarCamposParcelas = () => {
    const qtd = parseInt(document.getElementById('qtd-parcelas').value) || 1;
    const valBase = document.getElementById('valor-base').value || "";
    const container = document.getElementById('container-inputs-parcelas');
    container.innerHTML = '';
    for(let i = 1; i <= qtd; i++) {
        container.innerHTML += `<div class="input-parcela-wrapper"><label>Mês ${i}</label><input type="number" step="0.01" class="input-valor-mes" data-mes="${i}" value="${valBase}"></div>`;
    }
};

let totalRecebidoCache = 0;
let totalCustosCache = 0;

function carregarDadosCompletos() {
    onValue(dbRef, (snapshot) => {
        const lista = document.getElementById('lista-clientes');
        lista.innerHTML = '';
        totalRecebidoCache = 0;
        const data = snapshot.val();
        if (data) {
            const clientes = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            clientes.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));
            clientes.forEach(c => {
                renderizarCliente(c);
                if (c.taxa?.ativa && c.taxa.pago) totalRecebidoCache += parseFloat(c.taxa.valor);
                if(c.parcelas) c.parcelas.forEach(p => { if(p.pago) totalRecebidoCache += parseFloat(p.valor); });
            });
        }
        atualizarDashboard();
    });

    onValue(dbRefCustos, (snapshot) => {
        const lista = document.getElementById('lista-custos');
        lista.innerHTML = '';
        totalCustosCache = 0;
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const custo = data[key];
                totalCustosCache += parseFloat(custo.valor);
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${custo.nome}</td><td style="color:var(--neon-red);">R$ ${parseFloat(custo.valor).toFixed(2)}</td><td><button onclick="window.excluirCusto('${key}')" class="btn-logout" style="border:none;"><i class="fas fa-trash"></i></button></td>`;
                lista.appendChild(tr);
            });
        }
        atualizarDashboard();
    });
}

function atualizarDashboard() {
    const lucro = totalRecebidoCache - totalCustosCache;
    document.getElementById('total-recebido').innerText = `R$ ${totalRecebidoCache.toFixed(2)}`;
    document.getElementById('total-custos').innerText = `R$ ${totalCustosCache.toFixed(2)}`;
    const elLucro = document.getElementById('lucro-liquido');
    elLucro.innerText = `R$ ${lucro.toFixed(2)}`;
    elLucro.style.color = lucro >= 0 ? 'var(--neon-blue)' : 'var(--neon-red)';
}

function renderizarCliente(c) {
    const lista = document.getElementById('lista-clientes');
    const tr = document.createElement('tr');
    const totalP = c.parcelas ? c.parcelas.length : 0;
    const pagos = c.parcelas ? c.parcelas.filter(p => p.pago).length : 0;
    
    let htmlGestao = '<div class="grid-pagamentos">';
    if (c.taxa && c.taxa.ativa) {
        const st = c.taxa.pago ? 'pago' : 'pendente';
        htmlGestao += `<div class="badge-taxa ${st}" title="Instalação: R$ ${c.taxa.valor}" onclick="window.toggleTaxa('${c.id}', ${c.taxa.pago})"><i class="fas fa-wrench"></i> Inst.</div>`;
    }
    if(c.parcelas) {
        c.parcelas.forEach((p, i) => {
            const st = p.pago ? 'pago' : 'pendente';
            htmlGestao += `<div class="ball-parcela ${st}" title="Mês ${p.numero}: R$ ${p.valor}" onclick="window.toggleParcela('${c.id}', ${i}, ${p.pago})">${p.numero}</div>`;
        });
    }
    htmlGestao += '</div>';

    tr.innerHTML = `<td data-label="Início" style="color:var(--neon-blue); font-family:monospace;">${c.dataInicio.split('-').reverse().join('/')}</td><td data-label="Cliente" style="font-weight:bold;">${c.cliente}</td><td data-label="Plano">${c.plano}</td><td data-label="Progresso">${pagos}/${totalP}</td><td data-label="Financeiro">${htmlGestao}</td><td data-label="Ações"><button onclick="window.excluirCliente('${c.id}')" class="btn-logout"><i class="fas fa-trash"></i></button></td>`;
    lista.appendChild(tr);
}

// CADASTROS
const formCliente = document.getElementById('form-cliente');
if(formCliente) {
    formCliente.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputsValores = document.querySelectorAll('.input-valor-mes');
        let arrayParcelas = [];
        inputsValores.forEach(input => { arrayParcelas.push({ numero: parseInt(input.dataset.mes), valor: parseFloat(input.value) || 0, pago: false }); });

        const temTaxa = document.getElementById('check-taxa').checked;
        const valorTaxa = parseFloat(document.getElementById('valor-taxa').value) || 0;

        push(dbRef, {
            cliente: document.getElementById('cliente').value,
            plano: document.getElementById('plano').value,
            dataInicio: document.getElementById('data-inicio').value,
            taxa: { ativa: temTaxa, valor: temTaxa ? valorTaxa : 0, pago: false },
            parcelas: arrayParcelas
        });
        alert("Contrato Gerado!");
        formCliente.reset();
        document.getElementById('container-valor-taxa').style.display = 'none';
        window.gerarCamposParcelas(); 
        window.toggleForm('form-cliente');
    });
}
const formCustos = document.getElementById('form-custos');
if(formCustos) {
    formCustos.addEventListener('submit', (e) => {
        e.preventDefault();
        push(dbRefCustos, { nome: document.getElementById('custo-nome').value, valor: document.getElementById('custo-valor').value });
        formCustos.reset();
    });
}

// AÇÕES
window.toggleTaxa = (id, st) => update(ref(db, `${userPath}/clientes/${id}/taxa`), { pago: !st });
window.toggleParcela = (id, idx, st) => update(ref(db, `${userPath}/clientes/${id}/parcelas/${idx}`), { pago: !st });
window.excluirCliente = (id) => { if(confirm("Excluir cliente?")) remove(ref(db, `${userPath}/clientes/${id}`)); };
window.excluirCusto = (id) => { if(confirm("Remover despesa?")) remove(ref(db, `${userPath}/custos/${id}`)); };
window.filtrarTabela = () => {
    const termo = document.getElementById('busca').value.toLowerCase();
    document.querySelectorAll('#lista-clientes tr').forEach(l => l.style.display = l.innerText.toLowerCase().includes(termo) ? '' : 'none');
};
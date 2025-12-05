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
}

// FUNÇÃO WHATSAPP CORRIGIDA PARA TODOS OS PLANOS
window.irParaWhatsApp = function(nomePlano) {
    const numero = "5584996085794";
    const mensagem = `Tenho interesse no *Plano ${nomePlano}*`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// === VARIÁVEIS ===
let dbRef, dbRefCustos, userPath;

const PLANOS_INFO = {
    "basico": { nome: "Bot Básico", instalacao: 200, mensal: 70, hostFree: false },
    "essencial": { nome: "IA Essencial", instalacao: 300, mensal: 120, hostFree: false },
    "profissional": { nome: "IA Pro", instalacao: 400, mensal: 180, hostFree: true },
    "premium": { nome: "IA Elite + DB", instalacao: 500, mensal: 250, hostFree: true }
};

// === LOGIN ===
const landingPage = document.getElementById('landing-page');
const sistemaPrincipal = document.getElementById('sistema-principal');
const formLogin = document.getElementById('form-login');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.email.split('@')[0];
        userPath = `bot_manager/${username}`;
        dbRef = ref(db, `${userPath}/clientes`);
        dbRefCustos = ref(db, `${userPath}/custos`);
        
        landingPage.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        document.getElementById('usuario-logado').innerText = username.toUpperCase();
        carregarDadosCompletos();
    } else {
        landingPage.style.display = 'block';
        sistemaPrincipal.style.display = 'none';
    }
});

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('login-usuario').value.trim().toLowerCase();
        const senha = document.getElementById('login-senha').value.trim();
        signInWithEmailAndPassword(auth, `${usuario}@hdbyte.com`, senha).catch(() => alert("Dados Incorretos"));
    });
}
window.fazerLogout = () => signOut(auth);

// === AUTO PREENCHIMENTO ===
window.autoPreencherPlano = () => {
    const selecao = document.getElementById('select-modelo-plano').value;
    const checkHost = document.getElementById('check-hospedagem');
    if (selecao && PLANOS_INFO[selecao]) {
        const p = PLANOS_INFO[selecao];
        document.getElementById('plano').value = p.nome;
        document.getElementById('check-taxa').checked = true;
        window.toggleInputTaxa();
        document.getElementById('valor-taxa').value = p.instalacao;
        if (p.hostFree) { checkHost.checked = false; checkHost.disabled = true; } 
        else { checkHost.disabled = false; checkHost.checked = true; }
        let valor = p.mensal;
        if (!p.hostFree && checkHost.checked) valor += 20;
        document.getElementById('valor-base').value = valor;
        window.gerarCamposParcelas();
    }
};

// === SISTEMA ===
window.toggleForm = (id) => { const f = document.getElementById(id); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
window.toggleInputTaxa = () => { const chk = document.getElementById('check-taxa'); document.getElementById('container-valor-taxa').style.display = chk.checked ? 'block' : 'none'; };
window.gerarCamposParcelas = () => {
    const qtd = parseInt(document.getElementById('qtd-parcelas').value) || 1;
    const val = document.getElementById('valor-base').value || "";
    const container = document.getElementById('container-inputs-parcelas');
    container.innerHTML = '';
    for(let i=1; i<=qtd; i++) container.innerHTML += `<div class="input-parcela-wrapper"><label>${i}</label><input type="number" class="input-valor-mes" data-mes="${i}" value="${val}"></div>`;
};

let cacheRecebido=0, cacheCustos=0;

function carregarDadosCompletos() {
    onValue(dbRef, (snap) => {
        const lista = document.getElementById('lista-clientes');
        lista.innerHTML = ''; cacheRecebido = 0;
        const data = snap.val();
        if (data) {
            const arr = Object.keys(data).map(k => ({id:k, ...data[k]}));
            arr.sort((a,b) => new Date(b.dataInicio) - new Date(a.dataInicio));
            arr.forEach(c => {
                renderizarCliente(c);
                if(c.taxa?.ativa && c.taxa.pago) cacheRecebido += parseFloat(c.taxa.valor);
                if(c.parcelas) c.parcelas.forEach(p => { if(p.pago) cacheRecebido += parseFloat(p.valor); });
            });
        }
        atualizarDashboard();
    });
    onValue(dbRefCustos, (snap) => {
        const lista = document.getElementById('lista-custos');
        lista.innerHTML = ''; cacheCustos = 0;
        const data = snap.val();
        if(data) {
            Object.keys(data).forEach(k => {
                const item = data[k];
                cacheCustos += parseFloat(item.valor);
                lista.innerHTML += `<tr><td>${item.nome}</td><td style="color:var(--neon-red)">R$ ${item.valor}</td><td><button onclick="window.excluirCusto('${k}')" class="btn-logout" style="border:none"><i class="fas fa-trash"></i></button></td></tr>`;
            });
        }
        atualizarDashboard();
    });
}

function atualizarDashboard() {
    const lucro = cacheRecebido - cacheCustos;
    document.getElementById('total-recebido').innerText = `R$ ${cacheRecebido.toFixed(2)}`;
    document.getElementById('total-custos').innerText = `R$ ${cacheCustos.toFixed(2)}`;
    const el = document.getElementById('lucro-liquido');
    el.innerText = `R$ ${lucro.toFixed(2)}`;
    el.style.color = lucro >= 0 ? 'var(--neon-blue)' : 'var(--neon-red)';
}

function renderizarCliente(c) {
    const lista = document.getElementById('lista-clientes');
    const tr = document.createElement('tr');
    const tot = c.parcelas?.length || 0;
    const pag = c.parcelas?.filter(p=>p.pago).length || 0;
    
    let htmlFin = '<div class="grid-pagamentos">';
    if(c.taxa?.ativa) {
        const s = c.taxa.pago ? 'pago' : 'pendente';
        htmlFin += `<div class="badge-taxa ${s}" title="Taxa R$ ${c.taxa.valor}" onclick="window.toggleTaxa('${c.id}', ${c.taxa.pago})">Inst.</div>`;
    }
    if(c.parcelas) {
        c.parcelas.forEach((p,i) => {
            const s = p.pago ? 'pago' : 'pendente';
            htmlFin += `<div class="ball-parcela ${s}" title="Mês ${p.numero}: R$ ${p.valor}" onclick="window.toggleParcela('${c.id}', ${i}, ${p.pago})">${p.numero}</div>`;
        });
    }
    htmlFin += '</div>';
    
    tr.innerHTML = `<td data-label="Início" style="color:var(--neon-blue);font-family:monospace">${c.dataInicio.split('-').reverse().join('/')}</td>
    <td data-label="Cliente" style="font-weight:bold">${c.cliente}</td><td data-label="Plano">${c.plano}</td>
    <td data-label="Progresso">${pag}/${tot}</td><td data-label="Financeiro">${htmlFin}</td>
    <td data-label="X"><button onclick="window.excluirCliente('${c.id}')" class="btn-logout"><i class="fas fa-trash"></i></button></td>`;
    lista.appendChild(tr);
}

// Eventos
const fc = document.getElementById('form-cliente');
if(fc) fc.addEventListener('submit', e => {
    e.preventDefault();
    const parcs = [];
    document.querySelectorAll('.input-valor-mes').forEach(i => parcs.push({numero:parseInt(i.dataset.mes), valor:parseFloat(i.value)||0, pago:false}));
    const tTaxa = document.getElementById('check-taxa').checked;
    const vTaxa = parseFloat(document.getElementById('valor-taxa').value)||0;
    push(dbRef, { cliente: document.getElementById('cliente').value, plano: document.getElementById('plano').value, dataInicio: document.getElementById('data-inicio').value, taxa: {ativa:tTaxa, valor:tTaxa?vTaxa:0, pago:false}, parcelas: parcs });
    alert("Criado!"); fc.reset(); document.getElementById('container-valor-taxa').style.display='none'; window.gerarCamposParcelas();
});

const fCust = document.getElementById('form-custos');
if(fCust) fCust.addEventListener('submit', e => {
    e.preventDefault();
    push(dbRefCustos, {nome:document.getElementById('custo-nome').value, valor:document.getElementById('custo-valor').value});
    fCust.reset();
});

window.toggleTaxa = (id, s) => update(ref(db, `${userPath}/clientes/${id}/taxa`), {pago:!s});
window.toggleParcela = (id, ix, s) => update(ref(db, `${userPath}/clientes/${id}/parcelas/${ix}`), {pago:!s});
window.excluirCliente = (id) => { if(confirm("Apagar?")) remove(ref(db, `${userPath}/clientes/${id}`)); };
window.excluirCusto = (id) => { if(confirm("Apagar?")) remove(ref(db, `${userPath}/custos/${id}`)); };
window.filtrarTabela = () => {
    const t = document.getElementById('busca').value.toLowerCase();
    document.querySelectorAll('#lista-clientes tr').forEach(l => l.style.display = l.innerText.toLowerCase().includes(t)?'':'none');
};
// AIzaSyBLaOyPzX_lQE9yy6cksYC57InP96wsg3A << clinca hcc - firebase api key <<
// << hdbyte firebase key !! << 

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =================================================================
// ⚙️ ATENÇÃO: COLOQUE SUA API KEY REAL AQUI ABAIXO
// =================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCxdXJiVA0ZJclCrpFgPAcU7CfE8ErXeAo",
  authDomain: "sys-gestor-c6571.firebaseapp.com",
  databaseURL: "https://sys-gestor-c6571-default-rtdb.firebaseio.com",
  projectId: "sys-gestor-c6571",
  storageBucket: "sys-gestor-c6571.firebasestorage.app",
  messagingSenderId: "634332258432",
  appId: "1:634332258432:web:0fe9b4bcb128e566dc4665",
  measurementId: "G-831837W39V"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// === FUNÇÕES DE VENDA ===
window.irParaWhatsApp = function(nomePlano) {
    const numero = "5584996085794";
    // Mensagem psicológica: "Quero garantir minha vaga" soa mais decisivo
    const mensagem = `Olá! Quero garantir minha vaga no *Plano ${nomePlano}* com a condição especial.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
};

// Toast Simples
window.mostrarToast = (msg) => {
    const c = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.style.cssText = "background:#00f3ff; color:#000; padding:10px 20px; border-radius:4px; margin-bottom:10px; font-weight:bold; box-shadow:0 5px 15px rgba(0,0,0,0.5);";
    d.innerText = msg;
    c.appendChild(d);
    setTimeout(() => d.remove(), 3000);
};

// === LÓGICA DO SISTEMA ===
let dbRef, dbRefCustos, userPath;

// Dados dos Planos (Mantendo a lógica exata que você pediu)
const PLANOS_INFO = {
    "basico": { nome: "Bot Básico", instalacao: 200, mensal: 70, hostFree: false },
    "essencial": { nome: "IA Essencial", instalacao: 300, mensal: 120, hostFree: false },
    "profissional": { nome: "IA Pro", instalacao: 400, mensal: 180, hostFree: true },
    "premium": { nome: "IA Elite + DB", instalacao: 500, mensal: 250, hostFree: true }
};

// Auth
const landingPage = document.getElementById('landing-page');
const sistemaPrincipal = document.getElementById('sistema-principal');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logado
        const username = user.email.split('@')[0];
        userPath = `bot_manager/${username}`;
        dbRef = ref(db, `${userPath}/clientes`);
        dbRefCustos = ref(db, `${userPath}/custos`);
        
        landingPage.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        document.body.style.background = "#050a10"; // Fundo liso pro painel
        
        if(document.getElementById('usuario-logado')) 
            document.getElementById('usuario-logado').innerText = username.toUpperCase();
        
        carregarDadosCompletos();
    } else {
        // Não Logado
        landingPage.style.display = 'block';
        sistemaPrincipal.style.display = 'none';
    }
});

// Login Form
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-usuario').value.trim();
        const s = document.getElementById('login-senha').value.trim();
        const userClean = u.includes('@') ? u : `${u}@hdbyte.com`; // Facilita login
        
        signInWithEmailAndPassword(auth, userClean, s)
            .catch((err) => alert("Acesso negado."));
    });
}
window.fazerLogout = () => signOut(auth);

// === FUNÇÕES DO PAINEL (Preenchimento, Tabelas, etc) ===
// (Código mantido igual para garantir funcionalidade do gestor)
window.autoPreencherPlano = () => {
    const sel = document.getElementById('select-modelo-plano').value;
    const chkHost = document.getElementById('check-hospedagem');
    if(sel && PLANOS_INFO[sel]){
        const p = PLANOS_INFO[sel];
        document.getElementById('plano').value = p.nome;
        document.getElementById('check-taxa').checked = true;
        window.toggleInputTaxa();
        document.getElementById('valor-taxa').value = p.instalacao;
        if(p.hostFree){ chkHost.checked=false; chkHost.disabled=true; }
        else { chkHost.disabled=false; chkHost.checked=true; }
        let val = p.mensal;
        if(!p.hostFree && chkHost.checked) val += 20;
        document.getElementById('valor-base').value = val;
        window.gerarCamposParcelas();
    }
};

window.toggleForm = (id) => { const x = document.getElementById(id); x.style.display = x.style.display === 'none' ? 'block' : 'none'; }
window.toggleInputTaxa = () => { const c = document.getElementById('check-taxa'); document.getElementById('container-valor-taxa').style.display = c.checked ? 'block' : 'none'; }
window.gerarCamposParcelas = () => {
    const q = document.getElementById('qtd-parcelas').value;
    const v = document.getElementById('valor-base').value;
    const c = document.getElementById('container-inputs-parcelas');
    c.innerHTML = '';
    for(let i=1;i<=q;i++) c.innerHTML += `<div style="display:flex;flex-direction:column"><label style="font-size:10px">${i}</label><input type="number" class="input-valor-mes" data-mes="${i}" value="${v}" style="width:100%"></div>`;
};

// Funções de Banco de Dados (Leitura e Escrita)
function carregarDadosCompletos() {
    onValue(dbRef, (s) => {
        const l = document.getElementById('lista-clientes');
        l.innerHTML = '';
        let rec = 0;
        const d = s.val();
        if(d){
            const arr = Object.keys(d).map(k=>({id:k,...d[k]})).sort((a,b)=>new Date(b.dataInicio)-new Date(a.dataInicio));
            arr.forEach(c=>{
                // Renderização simplificada
                let htmlP = '';
                if(c.taxa?.ativa) htmlP += `<span onclick="window.toggleTaxa('${c.id}',${c.taxa.pago})" class="ball-parcela ${c.taxa.pago?'pago':''}">T</span>`;
                if(c.parcelas) c.parcelas.forEach((p,i)=> {
                    if(p.pago) rec += parseFloat(p.valor);
                    htmlP += `<span onclick="window.toggleParcela('${c.id}',${i},${p.pago})" class="ball-parcela ${p.pago?'pago':''}">${p.numero}</span>`;
                });
                if(c.taxa?.ativa && c.taxa.pago) rec += parseFloat(c.taxa.valor);
                
                l.innerHTML += `<tr><td>${c.cliente}</td><td>${c.plano}</td><td><div class="grid-pagamentos">${htmlP}</div></td><td><button onclick="window.excluirCliente('${c.id}')" class="btn-logout">X</button></td></tr>`;
            });
        }
        document.getElementById('total-recebido').innerText = `R$ ${rec.toFixed(2)}`;
        cacheRecebido = rec;
        attDash();
    });
    
    onValue(dbRefCustos, (s)=>{
        const l = document.getElementById('lista-custos');
        l.innerHTML=''; let cust=0;
        const d = s.val();
        if(d) Object.keys(d).forEach(k=>{
            cust += parseFloat(d[k].valor);
            l.innerHTML+=`<tr><td>${d[k].nome}</td><td>R$ ${d[k].valor}</td><td><button onclick="window.excluirCusto('${k}')">X</button></td></tr>`;
        });
        document.getElementById('total-custos').innerText = `R$ ${cust.toFixed(2)}`;
        cacheCustos = cust;
        attDash();
    });
}
let cacheRecebido=0, cacheCustos=0;
function attDash(){ document.getElementById('lucro-liquido').innerText = `R$ ${(cacheRecebido-cacheCustos).toFixed(2)}`; }

// Eventos Forms
const fc = document.getElementById('form-cliente');
if(fc) fc.addEventListener('submit', e=>{
    e.preventDefault();
    const parcs = [];
    document.querySelectorAll('.input-valor-mes').forEach(i=> parcs.push({numero:parseInt(i.dataset.mes),valor:parseFloat(i.value)||0,pago:false}));
    const tT = document.getElementById('check-taxa').checked;
    const vT = parseFloat(document.getElementById('valor-taxa').value)||0;
    push(dbRef, {
        cliente: document.getElementById('cliente').value,
        plano: document.getElementById('plano').value,
        dataInicio: document.getElementById('data-inicio').value,
        taxa: {ativa:tT, valor:tT?vT:0, pago:false},
        parcelas: parcs
    });
    fc.reset(); window.mostrarToast("Cliente Adicionado");
});
const fCust = document.getElementById('form-custos');
if(fCust) fCust.addEventListener('submit', e=>{
    e.preventDefault();
    push(dbRefCustos, {nome:document.getElementById('custo-nome').value, valor:document.getElementById('custo-valor').value});
    fCust.reset();
});

// Ações Globais
window.toggleTaxa = (id,s)=> update(ref(db,`${userPath}/clientes/${id}/taxa`),{pago:!s});
window.toggleParcela = (id,ix,s)=> update(ref(db,`${userPath}/clientes/${id}/parcelas/${ix}`),{pago:!s});
window.excluirCliente = (id)=> {if(confirm("Apagar?")) remove(ref(db,`${userPath}/clientes/${id}`));}
window.excluirCusto = (id)=> {if(confirm("Apagar?")) remove(ref(db,`${userPath}/custos/${id}`));}
window.filtrarTabela = () => {
    const t = document.getElementById('busca').value.toLowerCase();
    document.querySelectorAll('#lista-clientes tr').forEach(l => l.style.display = l.innerText.toLowerCase().includes(t)?'':'none');
};
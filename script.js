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

// Variáveis Globais
let dbRef;
let userPath;

// =================================================================
// 🔐 LOGIN & ROTEAMENTO (Separação Herick/Reysson)
// =================================================================
const telaLogin = document.getElementById('tela-login');
const sistemaPrincipal = document.getElementById('sistema-principal');
const formLogin = document.getElementById('form-login');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Pega 'herick' ou 'reysson' do email
        const username = user.email.split('@')[0];
        
        // Define o caminho exclusivo: bot_manager/herick
        userPath = `bot_manager/${username}`;
        dbRef = ref(db, userPath);
        
        // Atualiza UI
        telaLogin.style.display = 'none';
        sistemaPrincipal.style.display = 'block';
        document.getElementById('usuario-logado').innerText = username.toUpperCase();
        
        // Inicia o listener de dados
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
        
        // Autentica com domínio fixo
        signInWithEmailAndPassword(auth, `${usuario}@hdbyte.com`, senha)
            .catch((error) => {
                const msg = document.getElementById('msg-erro');
                msg.style.display = 'block';
                msg.innerText = "ACESSO NEGADO";
            });
    });
}

window.fazerLogout = () => signOut(auth);

// =================================================================
// 🧠 LÓGICA DE UI (Formulário e Inputs Dinâmicos)
// =================================================================

// 1. Mostrar/Esconder o formulário no mobile
window.toggleForm = () => {
    const f = document.getElementById('form-cliente');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

// 2. Mostrar/Esconder Input de Taxa
window.toggleInputTaxa = () => {
    const chk = document.getElementById('check-taxa');
    const container = document.getElementById('container-valor-taxa');
    container.style.display = chk.checked ? 'block' : 'none';
};

// 3. Gerar inputs de parcelas baseado na quantidade
window.gerarCamposParcelas = () => {
    const qtd = parseInt(document.getElementById('qtd-parcelas').value) || 1;
    const valBase = document.getElementById('valor-base').value || "";
    const container = document.getElementById('container-inputs-parcelas');
    
    container.innerHTML = ''; // Limpa

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

// Inicialização
if(document.getElementById('qtd-parcelas')) window.gerarCamposParcelas();


// =================================================================
// 💾 BANCO DE DADOS E RENDERIZAÇÃO
// =================================================================
const formCliente = document.getElementById('form-cliente');
const listaClientes = document.getElementById('lista-clientes');

function carregarClientes() {
    onValue(dbRef, (snapshot) => {
        listaClientes.innerHTML = '';
        let somaRecebido = 0;
        let somaPendente = 0;

        const data = snapshot.val();
        if (data) {
            const clientes = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            
            // Ordena por data mais recente
            clientes.sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio));

            clientes.forEach(c => {
                renderizarLinha(c);

                // --- CÁLCULO FINANCEIRO TOTAL ---
                
                // Soma Taxa
                if (c.taxa && c.taxa.ativa) {
                    const valorTaxa = parseFloat(c.taxa.valor);
                    if (c.taxa.pago) somaRecebido += valorTaxa;
                    else somaPendente += valorTaxa;
                }

                // Soma Parcelas
                if(c.parcelas) {
                    c.parcelas.forEach(p => {
                        const valorParc = parseFloat(p.valor);
                        if(p.pago) somaRecebido += valorParc;
                        else somaPendente += valorParc;
                    });
                }
            });
        }
        
        // Atualiza Dashboard
        document.getElementById('total-recebido').innerText = `R$ ${somaRecebido.toFixed(2).replace('.', ',')}`;
        document.getElementById('total-pendente').innerText = `R$ ${somaPendente.toFixed(2).replace('.', ',')}`;
    });
}

function renderizarLinha(c) {
    const tr = document.createElement('tr');
    
    // Calcula progresso (Apenas mensalidades)
    const totalP = c.parcelas ? c.parcelas.length : 0;
    const pagos = c.parcelas ? c.parcelas.filter(p => p.pago).length : 0;
    const porcentagem = totalP > 0 ? Math.round((pagos / totalP) * 100) : 0;
    
    // --- GERA HTML DA GESTÃO FINANCEIRA ---
    let htmlGestao = '<div class="grid-pagamentos">';

    // 1. Botão da Taxa (Se houver)
    if (c.taxa && c.taxa.ativa) {
        const classeTaxa = c.taxa.pago ? 'pago' : 'pendente';
        const textoStatus = c.taxa.pago ? 'PAGO' : 'PENDENTE';
        
        htmlGestao += `
            <div class="badge-taxa ${classeTaxa}"
                 title="Taxa Instalação: R$ ${parseFloat(c.taxa.valor).toFixed(2)}"
                 onclick="window.toggleTaxa('${c.id}', ${c.taxa.pago})">
                 <i class="fas fa-wrench"></i> Taxa (${textoStatus})
            </div>
        `;
    }

    // 2. Bolinhas das Parcelas
    if(c.parcelas) {
        c.parcelas.forEach((p, index) => {
            const classeStatus = p.pago ? 'pago' : 'pendente';
            const statusTexto = p.pago ? 'Pago!' : 'Aguardando';
            
            // Passamos o ID e o INDEX da parcela no array
            htmlGestao += `
                <div class="ball-parcela ${classeStatus}" 
                     title="Mês ${p.numero}: R$ ${parseFloat(p.valor).toFixed(2)} - ${statusTexto}"
                     onclick="window.toggleParcela('${c.id}', ${index}, ${p.pago})">
                     ${p.numero}
                </div>`;
        });
    }
    htmlGestao += '</div>';

    // Monta a linha da tabela (com data-label para mobile)
    tr.innerHTML = `
        <td data-label="Início" style="color:var(--neon-blue); font-family:monospace;">${c.dataInicio.split('-').reverse().join('/')}</td>
        <td data-label="Cliente" style="color:#fff; font-weight:bold;">${c.cliente}</td>
        <td data-label="Plano">${c.plano}</td>
        <td data-label="Progresso">${pagos}/${totalP} (${porcentagem}%)</td>
        <td data-label="Financeiro">${htmlGestao}</td>
        <td data-label="Ações">
            <button onclick="window.excluirCliente('${c.id}')" class="btn-logout" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
    `;
    listaClientes.appendChild(tr);
}

// --- SALVAR NOVO CLIENTE ---
if(formCliente) {
    formCliente.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 1. Coleta e constrói o array de parcelas
        const inputsValores = document.querySelectorAll('.input-valor-mes');
        let arrayParcelas = [];
        
        inputsValores.forEach(input => {
            arrayParcelas.push({
                numero: parseInt(input.dataset.mes),
                valor: parseFloat(input.value) || 0,
                pago: false 
            });
        });

        // 2. Coleta dados da Taxa
        const temTaxa = document.getElementById('check-taxa').checked;
        const valorTaxa = parseFloat(document.getElementById('valor-taxa').value) || 0;

        // 3. Monta o objeto completo
        const novoCliente = {
            cliente: document.getElementById('cliente').value,
            plano: document.getElementById('plano').value,
            dataInicio: document.getElementById('data-inicio').value,
            taxa: {
                ativa: temTaxa,
                valor: temTaxa ? valorTaxa : 0,
                pago: false
            },
            parcelas: arrayParcelas
        };

        // 4. Envia para a pasta do usuário logado
        push(dbRef, novoCliente);
        
        alert("Contrato Gerado com Sucesso!");
        formCliente.reset();
        
        // Reseta visual
        document.getElementById('container-valor-taxa').style.display = 'none';
        window.gerarCamposParcelas(); 
        window.toggleForm(); // Fecha o form no mobile
    });
}

// =================================================================
// ⚡ AÇÕES (UPDATE/DELETE)
// =================================================================

// Atualizar status da Taxa
window.toggleTaxa = (id, statusAtual) => {
    update(ref(db, `${userPath}/${id}/taxa`), { pago: !statusAtual });
};

// Atualizar status de uma Parcela Específica
window.toggleParcela = (id, indexParcela, statusAtual) => {
    // Acessa diretamente o índice no array de parcelas
    const pathParcela = `${userPath}/${id}/parcelas/${indexParcela}`;
    update(ref(db, pathParcela), { pago: !statusAtual });
};

// Excluir Contrato
window.excluirCliente = (id) => {
    if(confirm("ATENÇÃO: Isso apagará todo o histórico financeiro deste cliente. Continuar?")) {
        remove(ref(db, `${userPath}/${id}`));
    }
};

// Filtro de Busca
window.filtrarTabela = () => {
    const termo = document.getElementById('busca').value.toLowerCase();
    const linhas = document.querySelectorAll('#lista-clientes tr');
    linhas.forEach(l => {
        l.style.display = l.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
};
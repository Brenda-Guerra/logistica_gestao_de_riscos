/* ==========================================================================
   data.js — escalas, categorias e base de dados fictícia de demonstração
   Empresa fictícia: NordEletro S.A. (eletrodomésticos, fábrica em Suape/PE)
   Valores monetários em R$ mil.
   ========================================================================== */
const DATA = {};

/* ---- Escala de probabilidade (frequência anual) ---- */
DATA.PROB = [
  { n: 1, nome: 'Raro', faixa: 'menos de 1% ao ano', exemplo: 'uma vez em mais de 100 anos', p: 0.005 },
  { n: 2, nome: 'Improvável', faixa: '1% a 5% ao ano', exemplo: 'uma vez em 20 a 100 anos', p: 0.03 },
  { n: 3, nome: 'Possível', faixa: '5% a 20% ao ano', exemplo: 'uma vez em 5 a 20 anos', p: 0.12 },
  { n: 4, nome: 'Provável', faixa: '20% a 50% ao ano', exemplo: 'uma vez em 2 a 5 anos', p: 0.35 },
  { n: 5, nome: 'Quase certo', faixa: 'mais de 50% ao ano', exemplo: 'uma ou mais vezes por ano', p: 0.7 },
];

/* ---- Critérios explícitos de impacto (ferramenta de pontuação por dimensão) ---- */
DATA.IMPACT_NAMES = ['Insignificante', 'Pequeno', 'Moderado', 'Grande', 'Catastrófico'];
DATA.IMPACT = {
  pessoas: { nome: 'Pessoas', niveis: ['Sem lesão ou só primeiros socorros', 'Lesão leve, sem afastamento', 'Lesão com afastamento', 'Lesão grave ou incapacitante', 'Fatalidade'] },
  reputacao: { nome: 'Reputação', niveis: ['Sem repercussão externa', 'Reclamações pontuais de clientes', 'Repercussão regional ou em redes sociais', 'Mídia nacional ou perda de cliente-chave', 'Dano duradouro à marca, investigação pública'] },
  operacao: { nome: 'Processos e sistemas', niveis: ['Sem parada; atraso de horas', 'Atraso de 1 a 3 dias em um elo', 'Parada parcial de 1 a 2 semanas', 'Parada de fábrica ou CD por 2 a 6 semanas', 'Parada acima de 6 semanas ou perda de capacidade'] },
  financeiro: { nome: 'Financeiro', niveis: ['Até R$ 100 mil', 'R$ 100 mil a R$ 500 mil', 'R$ 500 mil a R$ 2 mi', 'R$ 2 mi a R$ 10 mi', 'Acima de R$ 10 mi'] },
};
DATA.FIN_LIMITS = [100, 500, 2000, 10000]; // limites (R$ mil) entre os níveis financeiros

/* ---- Tipos de risco (natureza) ---- */
DATA.TIPOS = {
  aleatorio: {
    nome: 'Aleatório', curto: 'Fora do controle da organização',
    desc: 'Causados por fatores normalmente fora do controle direto das organizações envolvidas.',
    exemplos: 'furacões, enchentes, terremotos, tornados e outros desastres naturais',
    estimar: 'Dados históricos, mapas de ocorrência e informações geográficas e climáticas.',
    tratar: 'Localização, redundância, planos de contingência e recuperação.',
  },
  acidental: {
    nome: 'Acidental', curto: 'Falhas não intencionais',
    desc: 'Não aleatórios, mas também não intencionais: imprudência, negligência, incompetência, falhas de processo ou imperfeições tecnológicas.',
    exemplos: 'atrasos de fornecedores, quebras de equipamentos, erros humanos, falhas de TI',
    estimar: 'Dados históricos do setor industrial e da própria empresa.',
    tratar: 'Padronizar, treinar, monitorar, prevenir e reduzir variabilidade.',
  },
  intencional: {
    nome: 'Intencional', curto: 'Ações deliberadas de terceiros',
    desc: 'Causados por uma ação deliberada de gerar interrupção, dano, perda ou pressão sobre a cadeia.',
    exemplos: 'roubos, sabotagem, greves, terrorismo, ataques cibernéticos',
    estimar: 'Histórico, inteligência, mapas de roubo, contexto político e social.',
    tratar: 'Segurança, rastreabilidade, parceiros confiáveis e respostas coordenadas.',
  },
};

/* ---- Categorias e fatores de risco em GCS ---- */
DATA.CATEGORIAS = [
  { id: 'unidades', nome: 'Unidades operacionais', fatores: ['Desastres, incêndios, greves e falhas de equipamentos', 'Problemas de infraestrutura e segurança', 'Conflitos, terrorismo e crime organizado', 'Dependência ou fragilidade financeira de fornecedores', 'Dependência de poucos clientes', 'Falhas de integração entre unidades'] },
  { id: 'rh', nome: 'Recursos humanos', fatores: ['Escassez de mão de obra', 'Falta de competências específicas', 'Greves, sindicatos e restrições trabalhistas locais'] },
  { id: 'tecnologia', nome: 'Tecnologia', fatores: ['Mudanças tecnológicas aceleradas', 'Espionagem industrial', 'Riscos à propriedade intelectual', 'Obsolescência tecnológica'] },
  { id: 'transporte', nome: 'Transporte', fatores: ['Baixa disponibilidade ou qualidade logística', 'Greves em portos, aeroportos e alfândegas', 'Roubo de carga e acidentes', 'Eventos climáticos e bloqueios de vias', 'Guerras e ataques terroristas'] },
  { id: 'fornecimento', nome: 'Fornecimento', fatores: ['Capacidade insuficiente de fornecedores', 'Baixa flexibilidade de suprimento', 'Problemas de qualidade', 'Alta de preços e escassez de insumos'] },
  { id: 'demanda', nome: 'Demanda', fatores: ['Lançamento de novos produtos', 'Ações e lançamentos da concorrência', 'Oscilações causadas pelo efeito chicote', 'Mudanças inesperadas na demanda'] },
  { id: 'si', nome: 'Sistemas de informação', fatores: ['Ataques cibernéticos a sites e plataformas', 'Roubo ou vazamento de dados', 'Falhas de sistemas e infraestrutura', 'Informações indisponíveis ou pouco confiáveis'] },
  { id: 'economico', nome: 'Ambiente econômico', fatores: ['Variações salariais', 'Oscilações de câmbio e juros', 'Recessão, impostos e intervenção estatal', 'Burocracia, corrupção e restrições governamentais'] },
  { id: 'politico', nome: 'Ambiente político', fatores: ['Mudanças de governo ou regime', 'Instabilidade política e conflitos internos', 'Alterações na legislação', 'Pressão de grupos de interesse e ONGs'] },
];

DATA.ALAVANCAS = {
  prob: ['Prevenção', 'Processos robustos', 'Monitoramento'],
  cons: ['Redundância', 'Flexibilidade', 'Agilidade'],
  transf: ['Seguro', 'Hedge / contrato'],
};
DATA.ESTRATEGIAS = {
  prob: 'Reduzir probabilidade',
  cons: 'Reduzir consequência',
  transf: 'Transferir risco',
};
DATA.STATUS_RISCO = ['Identificado', 'Em análise', 'Em tratamento', 'Monitorado', 'Aceito', 'Encerrado'];
DATA.STATUS_ACAO = ['Planejada', 'Em andamento', 'Concluída'];

DATA.PRINCIPIOS = [
  'Ponha ordem na sua casa antes de exigir que outros parceiros da cadeia ponham ordem nas deles.',
  'Diversificação reduz riscos.',
  'A robustez do sistema a interrupções é definida pelo seu elo mais fraco.',
  'Prevenção é melhor que correção.',
  'Sistemas excessivamente “enxutos” podem aumentar sua vulnerabilidade.',
  'Sistemas com alguma redundância de recursos são mais robustos.',
  'Colaboração e compartilhamento de informação são chave.',
  'Gestão de crise apenas não é suficiente.',
  'Modularidade pode alavancar esforços de redução de riscos.',
  'Princípios de qualidade e redução de variabilidade auxiliam a redução de riscos.',
];
DATA.MATURIDADE = ['Inexistente', 'Inicial', 'Parcial', 'Estabelecido', 'Otimizado'];

DATA.CAMADAS = ['Fornecedores nível 2', 'Fornecedores nível 1', 'Logística de entrada', 'Produção e sistemas', 'Distribuição', 'Clientes'];

DATA.MESES = ['Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26', 'Jun/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26'];

/* ==========================================================================
   Base de demonstração
   ========================================================================== */
DATA.seed = () => ({
  versao: 4,
  empresa: {
    nome: 'NordEletro S.A.',
    setor: 'Eletrodomésticos (refrigeradores, lavadoras e micro-ondas)',
    sede: 'Complexo Industrial Portuário de Suape — Ipojuca/PE',
    receitaAnual: 1200000, // R$ mil (R$ 1,2 bi)
    margem: 0.28, // margem de contribuição
    apetite: 15000, // perda anual tolerada (R$ mil)
  },

  /* Rede da cadeia de suprimentos.
     ttr = tempo para recuperar (semanas) · tts = tempo para sobreviver (semanas)
     receita = receita semanal dependente do nó (R$ mil/semana) */
  nodes: [
    { id: 'n_wafer', nome: 'Formosa Wafer Foundry', camada: 0, local: 'Hsinchu, Taiwan', papel: 'Wafers para microcontroladores (fornece a Shenzhen MicroTech)', ttr: 16, tts: 9, receita: 16000, fonteUnica: true },
    { id: 'n_resina', nome: 'Polinor Resinas', camada: 0, local: 'Camaçari, BA', papel: 'Resinas PP e ABS para a Plastnor', ttr: 6, tts: 5, receita: 19000, fonteUnica: true },
    { id: 'n_cobre', nome: 'Cobre Andino', camada: 0, local: 'Antofagasta, Chile', papel: 'Fio de cobre para motores e compressores', ttr: 8, tts: 10, receita: 18000, fonteUnica: false },
    { id: 'n_chip', nome: 'Shenzhen MicroTech', camada: 1, local: 'Shenzhen, China', papel: 'Placas de controle eletrônico (80% do volume)', ttr: 12, tts: 3, receita: 16000, fonteUnica: true },
    { id: 'n_comp', nome: 'Wuxi Compressores', camada: 1, local: 'Wuxi, China', papel: 'Compressores para refrigeradores', ttr: 10, tts: 7, receita: 9500, fonteUnica: false },
    { id: 'n_aco', nome: 'Siderúrgica Vale do Aço', camada: 1, local: 'Ipatinga, MG', papel: 'Aço laminado e pré-pintado', ttr: 4, tts: 4, receita: 20000, fonteUnica: false },
    { id: 'n_motor', nome: 'MotorSul', camada: 1, local: 'Jaraguá do Sul, SC', papel: 'Motores elétricos para lavadoras', ttr: 5, tts: 4, receita: 7000, fonteUnica: true },
    { id: 'n_plast', nome: 'Plastnor Injetados', camada: 1, local: 'Cabo de Santo Agostinho, PE', papel: 'Peças plásticas injetadas (just-in-time)', ttr: 3, tts: 1, receita: 21000, fonteUnica: false },
    { id: 'n_emb', nome: 'Embalagens Guararapes', camada: 1, local: 'Jaboatão dos Guararapes, PE', papel: 'Embalagens de papelão e EPS', ttr: 1, tts: 2, receita: 23000, fonteUnica: false },
    { id: 'n_porto', nome: 'Porto de Suape', camada: 2, local: 'Ipojuca, PE', papel: 'Entrada dos importados da Ásia', ttr: 2, tts: 3, receita: 18000, fonteUnica: false },
    { id: 'n_br101', nome: 'Corredor BR-101 / BR-232', camada: 2, local: 'Pernambuco', papel: 'Transporte rodoviário de insumos nacionais', ttr: 1, tts: 1.5, receita: 15000, fonteUnica: false },
    { id: 'n_fab', nome: 'Fábrica Suape', camada: 3, local: 'Ipojuca, PE', papel: 'Montagem final das três linhas de produto', ttr: 8, tts: 2.5, receita: 23000, fonteUnica: true },
    { id: 'n_erp', nome: 'ERP / WMS em nuvem', camada: 3, local: 'Data center — São Paulo', papel: 'Pedidos, planejamento, armazéns e faturamento', ttr: 1.5, tts: 0.4, receita: 23000, fonteUnica: true },
    { id: 'n_cdrec', nome: 'CD Recife', camada: 4, local: 'Jaboatão dos Guararapes, PE', papel: 'Atende PE, PB, RN e AL', ttr: 3, tts: 1.5, receita: 8000, fonteUnica: false },
    { id: 'n_cdssa', nome: 'CD Salvador', camada: 4, local: 'Simões Filho, BA', papel: 'Atende BA e SE', ttr: 3, tts: 3, receita: 5000, fonteUnica: false },
    { id: 'n_cdfor', nome: 'CD Fortaleza', camada: 4, local: 'Maracanaú, CE', papel: 'Atende CE, PI e MA', ttr: 3, tts: 3, receita: 4000, fonteUnica: false },
    { id: 'n_cdsp', nome: 'CD Guarulhos', camada: 4, local: 'Guarulhos, SP', papel: 'Atende Sudeste e Sul', ttr: 3, tts: 3.5, receita: 6000, fonteUnica: false },
    { id: 'n_varejo', nome: 'Grandes redes varejistas', camada: 5, local: 'Nacional', papel: '62% da receita, 5 redes concentram 48%', ttr: null, tts: null, receita: 14300, fonteUnica: false },
    { id: 'n_ecom', nome: 'E-commerce e marketplaces', camada: 5, local: 'Nacional', papel: '38% da receita', ttr: null, tts: null, receita: 8700, fonteUnica: false },
  ],
  edges: [
    ['n_wafer', 'n_chip'], ['n_resina', 'n_plast'], ['n_cobre', 'n_motor'], ['n_cobre', 'n_comp'],
    ['n_chip', 'n_porto'], ['n_comp', 'n_porto'], ['n_aco', 'n_br101'], ['n_motor', 'n_br101'],
    ['n_plast', 'n_fab'], ['n_emb', 'n_fab'], ['n_porto', 'n_fab'], ['n_br101', 'n_fab'], ['n_erp', 'n_fab', 'info'],
    ['n_fab', 'n_cdrec'], ['n_fab', 'n_cdssa'], ['n_fab', 'n_cdfor'], ['n_fab', 'n_cdsp'],
    ['n_cdrec', 'n_varejo'], ['n_cdssa', 'n_varejo'], ['n_cdfor', 'n_varejo'], ['n_cdsp', 'n_varejo'],
    ['n_cdrec', 'n_ecom'], ['n_cdsp', 'n_ecom'],
  ],

  /* Registro de riscos. p = nível de probabilidade (1–5); dims = impactos não financeiros (1–5);
     sev = perda por ocorrência [mínima, mais provável, máxima] em R$ mil (distribuição triangular). */
  risks: [
    { id: 'R01', titulo: 'Incêndio ou parada na fábrica de placas eletrônicas', cat: 'fornecimento', tipo: 'acidental', no: 'n_chip', p: 3, dims: { pessoas: 1, reputacao: 4, operacao: 5 }, sev: [3000, 12000, 45000], resp: 'Suprimentos — Eletrônicos', status: 'Em tratamento', data: '2026-03-10', kri: 'K01',
      causa: 'Fornecedor de fonte única para 80% das placas; sala limpa com histórico de pequenos incidentes.', consequencia: 'Falta de placas para as três linhas; parada da montagem após o fim do estoque de segurança.' },
    { id: 'R02', titulo: 'Terremoto em Taiwan interrompe fundição de wafers (nível 2)', cat: 'unidades', tipo: 'aleatorio', no: 'n_wafer', p: 2, dims: { pessoas: 1, reputacao: 3, operacao: 5 }, sev: [5000, 18000, 70000], resp: 'Suprimentos — Eletrônicos', status: 'Monitorado', data: '2026-03-10', kri: 'K02',
      causa: 'Região sísmica; a fundição abastece o fornecedor de placas e outros concorrentes.', consequencia: 'Racionamento de microcontroladores por 3 a 4 meses em todo o setor.' },
    { id: 'R03', titulo: 'Escassez global de semicondutores e alocação de capacidade', cat: 'fornecimento', tipo: 'aleatorio', no: 'n_chip', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 4 }, sev: [1500, 6000, 20000], resp: 'Suprimentos — Eletrônicos', status: 'Em tratamento', data: '2026-04-02', kri: 'K02',
      causa: 'Demanda de veículos e data centers disputa a mesma capacidade de fundição.', consequencia: 'Prazos de 30 a 50 semanas e alta de preço de componentes.' },
    { id: 'R04', titulo: 'Greve de portuários ou operação-padrão da fiscalização em Suape', cat: 'transporte', tipo: 'intencional', no: 'n_porto', p: 4, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [400, 1500, 5000], resp: 'Logística de entrada', status: 'Em tratamento', data: '2026-02-18', kri: 'K04',
      causa: 'Negociação salarial em aberto; histórico de operação-padrão de auditores fiscais.', consequencia: 'Contêineres retidos de 1 a 3 semanas; perda de produção de refrigeradores.' },
    { id: 'R05', titulo: 'Aumento do tempo de trânsito marítimo Ásia–Suape', cat: 'transporte', tipo: 'aleatorio', no: 'n_porto', p: 4, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [300, 1200, 4000], resp: 'Logística de entrada', status: 'Monitorado', data: '2026-05-06', kri: 'K12',
      causa: 'Desvios de rota por conflitos e congestionamento em transbordos.', consequencia: 'Lead time sobe de 38 para mais de 50 dias e o estoque de segurança fica curto.' },
    { id: 'R06', titulo: 'Roubo de carga no corredor BR-101 / BR-232', cat: 'transporte', tipo: 'intencional', no: 'n_br101', p: 5, dims: { pessoas: 3, reputacao: 2, operacao: 2 }, sev: [80, 350, 1500], resp: 'Segurança patrimonial', status: 'Em tratamento', data: '2026-01-20', kri: 'K05',
      causa: 'Trechos com alto índice de roubo; produtos de alto valor e fácil revenda.', consequencia: 'Perda da carga, risco aos motoristas e atraso de entregas.' },
    { id: 'R07', titulo: 'Chuvas intensas bloqueiam BR-101 e acessos a Suape', cat: 'transporte', tipo: 'aleatorio', no: 'n_br101', p: 3, dims: { pessoas: 2, reputacao: 2, operacao: 3 }, sev: [300, 1100, 4000], resp: 'Logística de entrada', status: 'Em tratamento', data: '2026-04-15', kri: 'K09',
      causa: 'Quadra chuvosa de abril a julho na Zona da Mata e Região Metropolitana do Recife.', consequencia: 'Insumos nacionais param na estrada por 2 a 7 dias.' },
    { id: 'R08', titulo: 'Incêndio de grandes proporções na Fábrica Suape', cat: 'unidades', tipo: 'acidental', no: 'n_fab', p: 2, dims: { pessoas: 5, reputacao: 4, operacao: 5 }, sev: [8000, 40000, 180000], resp: 'Diretoria Industrial', status: 'Em tratamento', data: '2026-01-12', kri: null,
      causa: 'Cabine de pintura e estoque de embalagens EPS concentram carga de incêndio.', consequencia: 'Fábrica única: parada de 2 a 6 meses e risco à vida.' },
    { id: 'R09', titulo: 'Quebra da linha de pintura ou da prensa de estampagem', cat: 'unidades', tipo: 'acidental', no: 'n_fab', p: 4, dims: { pessoas: 2, reputacao: 1, operacao: 3 }, sev: [200, 900, 3000], resp: 'Manutenção', status: 'Em tratamento', data: '2026-02-03', kri: null,
      causa: 'Equipamentos com 14 anos de uso e peças importadas.', consequencia: 'Parada de 3 a 10 dias das linhas de refrigeradores e lavadoras.' },
    { id: 'R10', titulo: 'Ataque de ransomware ao ERP / WMS', cat: 'si', tipo: 'intencional', no: 'n_erp', p: 3, dims: { pessoas: 1, reputacao: 4, operacao: 4 }, sev: [1500, 6000, 25000], resp: 'TI e Segurança da Informação', status: 'Em tratamento', data: '2026-03-25', kri: 'K08',
      causa: 'Setor industrial é alvo frequente; acessos remotos de fornecedores ao sistema.', consequencia: 'Sem pedidos, separação e faturamento por 1 a 3 semanas.' },
    { id: 'R11', titulo: 'Fraude na troca de dados bancários de fornecedores', cat: 'si', tipo: 'intencional', no: 'n_erp', p: 4, dims: { pessoas: 1, reputacao: 2, operacao: 1 }, sev: [100, 600, 3000], resp: 'Financeiro', status: 'Em tratamento', data: '2026-06-11', kri: null,
      causa: 'E-mails falsos pedindo alteração de conta para pagamento.', consequencia: 'Pagamento desviado e fornecedor sem receber.' },
    { id: 'R12', titulo: 'Falha de integração ERP–WMS na troca de versão', cat: 'si', tipo: 'acidental', no: 'n_erp', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [200, 800, 2500], resp: 'TI e Segurança da Informação', status: 'Identificado', data: '2026-08-22', kri: 'K08',
      causa: 'Atualização planejada para janeiro de 2027 sem ambiente de testes completo.', consequencia: 'Pedidos travados e estoques divergentes por vários dias.' },
    { id: 'R13', titulo: 'Fragilidade financeira da MotorSul (fonte única de motores)', cat: 'unidades', tipo: 'acidental', no: 'n_motor', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 4 }, sev: [1000, 4000, 12000], resp: 'Suprimentos — Eletromecânicos', status: 'Em tratamento', data: '2026-07-30', kri: 'K03',
      causa: 'Z-score em queda há 12 meses e renegociação de dívida.', consequencia: 'Interrupção de motores para a linha de lavadoras.' },
    { id: 'R14', titulo: 'Atrasos recorrentes da Wuxi Compressores', cat: 'fornecimento', tipo: 'acidental', no: 'n_comp', p: 4, dims: { pessoas: 1, reputacao: 2, operacao: 3 }, sev: [300, 1000, 3500], resp: 'Suprimentos — Eletromecânicos', status: 'Em tratamento', data: '2026-02-27', kri: 'K01',
      causa: 'Capacidade disputada com clientes maiores no pico do verão.', consequencia: 'Paradas curtas e horas extras na linha de refrigeradores.' },
    { id: 'R15', titulo: 'Lote de compressores defeituosos leva a recall', cat: 'fornecimento', tipo: 'acidental', no: 'n_comp', p: 2, dims: { pessoas: 3, reputacao: 5, operacao: 3 }, sev: [2000, 8000, 30000], resp: 'Qualidade', status: 'Em tratamento', data: '2026-02-27', kri: null,
      causa: 'Troca de subfornecedor de válvulas sem aviso prévio.', consequencia: 'Recall, troca em campo e exposição na mídia.' },
    { id: 'R16', titulo: 'Alta de preço do aço laminado', cat: 'fornecimento', tipo: 'aleatorio', no: 'n_aco', p: 4, dims: { pessoas: 1, reputacao: 1, operacao: 1 }, sev: [400, 1500, 5000], resp: 'Suprimentos — Metálicos', status: 'Monitorado', data: '2026-05-20', kri: null,
      causa: 'Ciclos de preço internacional e medidas antidumping.', consequencia: 'Margem comprimida em até 1,5 ponto percentual.' },
    { id: 'R17', titulo: 'Desvalorização do real encarece insumos importados', cat: 'economico', tipo: 'aleatorio', no: 'n_porto', p: 4, dims: { pessoas: 1, reputacao: 1, operacao: 1 }, sev: [600, 1800, 8000], resp: 'Financeiro', status: 'Em tratamento', data: '2026-05-20', kri: 'K07',
      causa: '34% do custo de materiais é cotado em dólar.', consequencia: 'Custo sobe antes que o preço de venda possa ser reajustado.' },
    { id: 'R18', titulo: 'Mudança tributária reduz incentivo fiscal estadual', cat: 'politico', tipo: 'aleatorio', no: 'n_fab', p: 3, dims: { pessoas: 1, reputacao: 1, operacao: 1 }, sev: [1000, 4000, 10000], resp: 'Tributário', status: 'Monitorado', data: '2026-06-01', kri: null,
      causa: 'Transição da reforma tributária e revisão de benefícios de ICMS.', consequencia: 'Custo logístico e tributário da operação em PE aumenta.' },
    { id: 'R19', titulo: 'Escassez de técnicos de manutenção e eletrônica', cat: 'rh', tipo: 'acidental', no: 'n_fab', p: 3, dims: { pessoas: 1, reputacao: 1, operacao: 2 }, sev: [150, 500, 1500], resp: 'Recursos Humanos', status: 'Em tratamento', data: '2026-04-09', kri: 'K10',
      causa: 'Concorrência por mão de obra qualificada no complexo de Suape.', consequencia: 'Reparos mais lentos e dependência de terceiros.' },
    { id: 'R20', titulo: 'Greve dos metalúrgicos na fábrica', cat: 'rh', tipo: 'intencional', no: 'n_fab', p: 2, dims: { pessoas: 1, reputacao: 2, operacao: 4 }, sev: [800, 3000, 9000], resp: 'Recursos Humanos', status: 'Monitorado', data: '2026-04-09', kri: 'K10',
      causa: 'Data-base em março e pauta de reajuste acima da inflação.', consequencia: 'Paralisação de 1 a 3 semanas.' },
    { id: 'R21', titulo: 'Perda de uma das cinco maiores redes varejistas', cat: 'unidades', tipo: 'acidental', no: 'n_varejo', p: 2, dims: { pessoas: 1, reputacao: 3, operacao: 3 }, sev: [3000, 10000, 30000], resp: 'Comercial', status: 'Em tratamento', data: '2026-01-30', kri: null,
      causa: 'Cinco redes concentram 48% da receita.', consequencia: 'Queda de volume e ociosidade da fábrica.' },
    { id: 'R22', titulo: 'Erro de previsão e efeito chicote na Black Friday', cat: 'demanda', tipo: 'acidental', no: 'n_ecom', p: 4, dims: { pessoas: 1, reputacao: 3, operacao: 2 }, sev: [400, 1500, 5000], resp: 'Planejamento de Demanda', status: 'Em tratamento', data: '2026-09-15', kri: 'K11',
      causa: 'Pedidos dos varejistas amplificam as variações do consumidor final.', consequencia: 'Ruptura em alguns itens e excesso em outros.' },
    { id: 'R23', titulo: 'Concorrente asiático lança linha com preço agressivo', cat: 'demanda', tipo: 'intencional', no: 'n_varejo', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 1 }, sev: [1000, 3500, 10000], resp: 'Marketing', status: 'Monitorado', data: '2026-08-05', kri: null,
      causa: 'Nova fábrica de concorrente em Manaus anunciada para 2027.', consequencia: 'Perda de participação nas faixas de entrada.' },
    { id: 'R24', titulo: 'Obsolescência das placas por mudança de padrão de conectividade', cat: 'tecnologia', tipo: 'acidental', no: 'n_chip', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 2 }, sev: [300, 1200, 4000], resp: 'Engenharia de Produto', status: 'Identificado', data: '2026-09-02', kri: null,
      causa: 'Componentes de Wi-Fi em fim de vida anunciado pelo fabricante.', consequencia: 'Redesenho às pressas e estoque obsoleto.' },
    { id: 'R25', titulo: 'Vazamento do projeto da nova linha de lavadoras', cat: 'tecnologia', tipo: 'intencional', no: 'n_erp', p: 2, dims: { pessoas: 1, reputacao: 3, operacao: 1 }, sev: [500, 2500, 8000], resp: 'Engenharia de Produto', status: 'Em análise', data: '2026-09-02', kri: null,
      causa: 'Desenhos compartilhados por e-mail com vários fornecedores.', consequencia: 'Perda de vantagem competitiva no lançamento.' },
    { id: 'R26', titulo: 'Falta de resina paralisa a Plastnor', cat: 'fornecimento', tipo: 'acidental', no: 'n_resina', p: 3, dims: { pessoas: 1, reputacao: 2, operacao: 4 }, sev: [400, 1500, 5000], resp: 'Suprimentos — Plásticos', status: 'Identificado', data: '2026-10-07', kri: null,
      causa: 'Fornecedor nível 2 único; paradas programadas pouco comunicadas.', consequencia: 'Plastnor opera just-in-time e para em 1 semana.' },
    { id: 'R27', titulo: 'Alagamento do CD Recife', cat: 'unidades', tipo: 'aleatorio', no: 'n_cdrec', p: 2, dims: { pessoas: 2, reputacao: 2, operacao: 3 }, sev: [300, 1200, 4000], resp: 'Distribuição', status: 'Monitorado', data: '2026-04-15', kri: 'K09',
      causa: 'Galpão em área com histórico de alagamento em chuvas acima de 100 mm/dia.', consequencia: 'Avaria de estoque e suspensão de entregas no Nordeste setentrional.' },
    { id: 'R28', titulo: 'Restrição de exportação de componentes eletrônicos', cat: 'politico', tipo: 'intencional', no: 'n_chip', p: 2, dims: { pessoas: 1, reputacao: 2, operacao: 5 }, sev: [2000, 9000, 35000], resp: 'Suprimentos — Eletrônicos', status: 'Monitorado', data: '2026-06-20', kri: null,
      causa: 'Tensões comerciais podem levar a controles de exportação de chips.', consequencia: 'Fornecimento da Ásia suspenso sem prazo definido.' },
  ],

  /* Plano de ações. redP = redução da probabilidade (0–1); redC = redução da consequência (0–1);
     cobertura/franquia = transferência (seguro ou hedge). custo = R$ mil/ano. */
  actions: [
    { id: 'A01', riscos: ['R01', 'R03'], titulo: 'Qualificar segundo fornecedor nacional de placas (Manaus EletroTec)', estrategia: 'cons', alavanca: 'Redundância', redP: 0, redC: 0.45, custo: 650, status: 'Em andamento', progresso: 60, resp: 'Engenharia de Suprimentos', prazo: '2026-12-15' },
    { id: 'A02', riscos: ['R01', 'R02'], titulo: 'Estoque estratégico de 6 semanas das placas críticas', estrategia: 'cons', alavanca: 'Redundância', redP: 0, redC: 0.25, custo: 420, status: 'Concluída', progresso: 100, resp: 'Planejamento de Materiais', prazo: '2026-06-30' },
    { id: 'A03', riscos: ['R01', 'R02', 'R28'], titulo: 'Mapear fornecedores nível 2 e monitorar eventos 24h', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.2, custo: 180, status: 'Em andamento', progresso: 80, resp: 'Gestão de Riscos', prazo: '2026-11-30' },
    { id: 'A04', riscos: ['R01'], titulo: 'Seguro de lucros cessantes contingente (fornecedor)', estrategia: 'transf', alavanca: 'Seguro', redP: 0, redC: 0, cobertura: 0.6, franquia: 2000, custo: 380, status: 'Concluída', progresso: 100, resp: 'Financeiro', prazo: '2026-04-01' },
    { id: 'A05', riscos: ['R02', 'R03', 'R28'], titulo: 'Redesenho modular da placa para aceitar duas famílias de microcontroladores', estrategia: 'cons', alavanca: 'Flexibilidade', redP: 0, redC: 0.35, custo: 900, status: 'Planejada', progresso: 0, resp: 'Engenharia de Produto', prazo: '2027-03-30' },
    { id: 'A06', riscos: ['R03'], titulo: 'Contrato de reserva de capacidade com distribuidor de componentes', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.3, redC: 0, custo: 250, status: 'Em andamento', progresso: 40, resp: 'Suprimentos — Eletrônicos', prazo: '2026-12-20' },
    { id: 'A07', riscos: ['R04', 'R05'], titulo: 'Rota alternativa pré-contratada via Porto do Pecém (CE)', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.4, custo: 120, status: 'Concluída', progresso: 100, resp: 'Logística de entrada', prazo: '2026-05-15' },
    { id: 'A08', riscos: ['R05', 'R14'], titulo: 'Estoque de segurança de compressores +2 semanas', estrategia: 'cons', alavanca: 'Redundância', redP: 0, redC: 0.3, custo: 210, status: 'Concluída', progresso: 100, resp: 'Planejamento de Materiais', prazo: '2026-07-31' },
    { id: 'A09', riscos: ['R06'], titulo: 'Escolta, rastreamento com cerca eletrônica e rodagem só de dia', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.45, redC: 0, custo: 300, status: 'Concluída', progresso: 100, resp: 'Segurança patrimonial', prazo: '2026-03-31' },
    { id: 'A10', riscos: ['R06'], titulo: 'Seguro de transporte RCTR-C e RCF-DC', estrategia: 'transf', alavanca: 'Seguro', redP: 0, redC: 0, cobertura: 0.9, franquia: 50, custo: 160, status: 'Concluída', progresso: 100, resp: 'Financeiro', prazo: '2026-02-28' },
    { id: 'A11', riscos: ['R07', 'R27'], titulo: 'Plano de contingência de chuvas com alertas da APAC e rotas BR-232 / PE-060', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.35, custo: 60, status: 'Em andamento', progresso: 50, resp: 'Logística de entrada', prazo: '2027-03-31' },
    { id: 'A12', riscos: ['R08'], titulo: 'Sprinklers, detecção precoce e brigada treinada (NR-23)', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.4, redC: 0.4, custo: 350, status: 'Concluída', progresso: 100, resp: 'Segurança do Trabalho', prazo: '2026-05-30' },
    { id: 'A13', riscos: ['R08'], titulo: 'Seguro patrimonial com lucros cessantes da fábrica', estrategia: 'transf', alavanca: 'Seguro', redP: 0, redC: 0, cobertura: 0.8, franquia: 3000, custo: 950, status: 'Concluída', progresso: 100, resp: 'Financeiro', prazo: '2026-01-31' },
    { id: 'A14', riscos: ['R09'], titulo: 'Manutenção preditiva por análise de vibração', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.4, redC: 0.1, custo: 140, status: 'Em andamento', progresso: 70, resp: 'Manutenção', prazo: '2026-12-31' },
    { id: 'A15', riscos: ['R10', 'R12'], titulo: 'Backup imutável fora da rede e plano de recuperação testado (RTO 24h)', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.5, custo: 280, status: 'Em andamento', progresso: 50, resp: 'TI e Segurança da Informação', prazo: '2026-12-10' },
    { id: 'A16', riscos: ['R10', 'R11'], titulo: 'Treinamento antiphishing e autenticação em dois fatores', estrategia: 'prob', alavanca: 'Processos robustos', redP: 0.45, redC: 0, custo: 90, status: 'Concluída', progresso: 100, resp: 'TI e Segurança da Informação', prazo: '2026-06-30' },
    { id: 'A17', riscos: ['R11'], titulo: 'Dupla validação por telefone para troca de conta bancária', estrategia: 'prob', alavanca: 'Processos robustos', redP: 0.7, redC: 0, custo: 15, status: 'Concluída', progresso: 100, resp: 'Financeiro', prazo: '2026-07-15' },
    { id: 'A18', riscos: ['R10'], titulo: 'Seguro de riscos cibernéticos', estrategia: 'transf', alavanca: 'Seguro', redP: 0, redC: 0, cobertura: 0.7, franquia: 500, custo: 220, status: 'Planejada', progresso: 0, resp: 'Financeiro', prazo: '2027-02-28' },
    { id: 'A19', riscos: ['R13'], titulo: 'Homologar fornecedor alternativo de motores e acompanhar Z-score', estrategia: 'cons', alavanca: 'Redundância', redP: 0, redC: 0.4, custo: 200, status: 'Em andamento', progresso: 30, resp: 'Suprimentos — Eletromecânicos', prazo: '2026-10-15' },
    { id: 'A20', riscos: ['R14', 'R15'], titulo: 'Auditoria de qualidade na origem e inspeção por amostragem (NBR 5426)', estrategia: 'prob', alavanca: 'Processos robustos', redP: 0.35, redC: 0, custo: 110, status: 'Em andamento', progresso: 60, resp: 'Qualidade', prazo: '2026-12-31' },
    { id: 'A21', riscos: ['R16', 'R17'], titulo: 'Hedge cambial de 70% das importações e contrato de aço indexado', estrategia: 'transf', alavanca: 'Hedge / contrato', redP: 0, redC: 0, cobertura: 0.6, franquia: 0, custo: 180, status: 'Concluída', progresso: 100, resp: 'Financeiro', prazo: '2026-06-30' },
    { id: 'A22', riscos: ['R18'], titulo: 'Acompanhamento legislativo e simulação de cenários tributários', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.2, custo: 120, status: 'Em andamento', progresso: 50, resp: 'Tributário', prazo: '2027-01-31' },
    { id: 'A23', riscos: ['R19'], titulo: 'Programa de formação técnica com o SENAI-PE', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.35, redC: 0, custo: 160, status: 'Em andamento', progresso: 40, resp: 'Recursos Humanos', prazo: '2026-09-30' },
    { id: 'A24', riscos: ['R20'], titulo: 'Mesa de negociação permanente com o sindicato', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.3, redC: 0, custo: 40, status: 'Concluída', progresso: 100, resp: 'Recursos Humanos', prazo: '2026-03-31' },
    { id: 'A25', riscos: ['R21'], titulo: 'Diversificar canais: 45% da receita fora das cinco maiores redes', estrategia: 'cons', alavanca: 'Flexibilidade', redP: 0, redC: 0.3, custo: 300, status: 'Em andamento', progresso: 35, resp: 'Comercial', prazo: '2027-06-30' },
    { id: 'A26', riscos: ['R22'], titulo: 'Planejamento colaborativo (CPFR) com os 5 maiores clientes', estrategia: 'prob', alavanca: 'Monitoramento', redP: 0.35, redC: 0, custo: 150, status: 'Em andamento', progresso: 55, resp: 'Planejamento de Demanda', prazo: '2026-11-20' },
    { id: 'A27', riscos: ['R22', 'R23'], titulo: 'Postergação da configuração final e embalagem por canal', estrategia: 'cons', alavanca: 'Flexibilidade', redP: 0, redC: 0.25, custo: 230, status: 'Planejada', progresso: 0, resp: 'Engenharia Industrial', prazo: '2027-04-30' },
    { id: 'A28', riscos: ['R24'], titulo: 'Roadmap tecnológico e compra final de componentes em fim de vida', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.3, custo: 80, status: 'Planejada', progresso: 0, resp: 'Engenharia de Produto', prazo: '2027-02-28' },
    { id: 'A29', riscos: ['R25'], titulo: 'Classificação da informação, DLP e acordos de confidencialidade', estrategia: 'prob', alavanca: 'Prevenção', redP: 0.4, redC: 0, custo: 130, status: 'Em andamento', progresso: 30, resp: 'TI e Segurança da Informação', prazo: '2026-10-31' },
    { id: 'A30', riscos: ['R26'], titulo: 'Segunda fonte de resina importada e estoque de 3 semanas na Plastnor', estrategia: 'cons', alavanca: 'Redundância', redP: 0, redC: 0.4, custo: 140, status: 'Planejada', progresso: 0, resp: 'Suprimentos — Plásticos', prazo: '2027-01-31' },
    { id: 'A31', riscos: ['R04'], titulo: 'Certificação OEA para despacho aduaneiro prioritário', estrategia: 'cons', alavanca: 'Agilidade', redP: 0, redC: 0.25, custo: 90, status: 'Em andamento', progresso: 70, resp: 'Comércio Exterior', prazo: '2026-12-31' },
  ],

  /* Indicadores-chave de risco (KRIs). dir: 'maior' = maior é melhor. */
  kris: [
    { id: 'K01', nome: 'OTIF da Shenzhen MicroTech', unidade: '%', dir: 'maior', verde: 95, vermelho: 90, no: 'n_chip', dec: 0, hist: [97, 96, 97, 95, 94, 93, 94, 92, 91, 90, 89, 88] },
    { id: 'K02', nome: 'Cobertura de estoque de placas eletrônicas', unidade: 'dias', dir: 'maior', verde: 30, vermelho: 15, no: 'n_chip', dec: 0, hist: [42, 40, 38, 35, 33, 30, 44, 43, 38, 30, 24, 19] },
    { id: 'K03', nome: 'Z-score de Altman da MotorSul', unidade: '', dir: 'maior', verde: 2.99, vermelho: 1.81, no: 'n_motor', dec: 2, hist: [3.1, 3.0, 2.9, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.95] },
    { id: 'K04', nome: 'Tempo de liberação aduaneira em Suape', unidade: 'dias', dir: 'menor', verde: 4, vermelho: 7, no: 'n_porto', dec: 1, hist: [3.4, 3.6, 3.2, 3.5, 3.9, 4.4, 3.8, 3.6, 4.1, 4.9, 5.4, 5.8] },
    { id: 'K05', nome: 'Roubos de carga no corredor BR-101 / BR-232', unidade: 'ocorr./mês', dir: 'menor', verde: 2, vermelho: 4, no: 'n_br101', dec: 0, hist: [2, 1, 3, 2, 2, 3, 4, 3, 4, 5, 4, 5] },
    { id: 'K06', nome: 'Concentração de compras de eletrônicos (HHI)', unidade: 'pontos', dir: 'menor', verde: 3400, vermelho: 6000, no: 'n_chip', dec: 0, hist: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 8200, 7400, 6800] },
    { id: 'K07', nome: 'Volatilidade do câmbio USD/BRL (30 dias)', unidade: '% a.a.', dir: 'menor', verde: 10, vermelho: 18, no: 'n_porto', dec: 1, hist: [11.2, 12.5, 14.1, 13.0, 12.2, 15.8, 16.4, 13.9, 12.7, 13.5, 14.9, 15.6] },
    { id: 'K08', nome: 'Disponibilidade do ERP / WMS', unidade: '%', dir: 'maior', verde: 99.5, vermelho: 99, no: 'n_erp', dec: 1, hist: [99.9, 99.8, 99.7, 99.2, 99.8, 99.9, 99.6, 99.9, 99.8, 99.4, 99.7, 99.6] },
    { id: 'K09', nome: 'Chuva acumulada no mês — Região Metropolitana do Recife', unidade: 'mm', dir: 'menor', verde: 250, vermelho: 400, no: 'n_br101', dec: 0, hist: [45, 60, 95, 120, 210, 330, 420, 390, 280, 150, 70, 40] },
    { id: 'K10', nome: 'Absenteísmo na fábrica', unidade: '%', dir: 'menor', verde: 3, vermelho: 5, no: 'n_fab', dec: 1, hist: [2.8, 2.9, 3.1, 2.7, 2.9, 3.2, 3.3, 3.1, 3.4, 3.5, 3.4, 3.6] },
    { id: 'K11', nome: 'Erro de previsão de demanda (MAPE)', unidade: '%', dir: 'menor', verde: 20, vermelho: 30, no: 'n_ecom', dec: 0, hist: [26, 31, 22, 19, 18, 20, 21, 19, 20, 23, 24, 27] },
    { id: 'K12', nome: 'Tempo de trânsito marítimo Ásia–Suape', unidade: 'dias', dir: 'menor', verde: 40, vermelho: 55, no: 'n_porto', dec: 0, hist: [38, 39, 38, 41, 44, 46, 45, 47, 49, 50, 51, 52] },
  ],

  /* Eventos e sinais fracos captados pelo monitoramento */
  alerts: [
    { id: 'E01', data: '2026-11-03', titulo: 'Incêndio em sala limpa reportado em fundição de wafers em Hsinchu', fonte: 'Monitoramento de notícias (Taiwan)', no: 'n_wafer', sev: 'Alta', status: 'Novo', risco: 'R02',
      texto: 'Imprensa local relata incêndio controlado em menos de 1 hora. A fundição não confirmou se a Formosa Wafer Foundry foi afetada. Situação semelhante ao incêndio da Philips em 2000: o dano real pode só aparecer semanas depois.' },
    { id: 'E02', data: '2026-11-02', titulo: 'OTIF da Shenzhen MicroTech abaixo do limite crítico pelo 3º mês', fonte: 'KRI K01', no: 'n_chip', sev: 'Alta', status: 'Novo', risco: 'R01',
      texto: 'Entregas no prazo e completas caíram de 97% para 88% em 12 meses. Junto com a cobertura de estoque em 19 dias, o fornecedor de fonte única virou o elo mais fraco.' },
    { id: 'E03', data: '2026-10-30', titulo: 'Sindicato dos portuários de Suape aprova estado de greve', fonte: 'Imprensa local', no: 'n_porto', sev: 'Média', status: 'Reconhecido', risco: 'R04',
      texto: 'Assembleia aprovou paralisação a partir de 18/11 se não houver acordo. Há 14 contêineres da NordEletro com chegada prevista nesse período.' },
    { id: 'E04', data: '2026-10-28', titulo: 'MotorSul divulga prejuízo no 3º trimestre e renegocia dívida', fonte: 'Demonstrações financeiras', no: 'n_motor', sev: 'Média', status: 'Novo', risco: 'R13',
      texto: 'Z-score estimado caiu para 1,95, na zona cinzenta (entre 1,81 e 2,99). Homologação do fornecedor alternativo está atrasada.' },
    { id: 'E05', data: '2026-10-25', titulo: 'Pedidos do e-commerce 35% acima da previsão na semana 43', fonte: 'KRI K11', no: 'n_ecom', sev: 'Média', status: 'Reconhecido', risco: 'R22',
      texto: 'Pré-venda de Black Friday puxou micro-ondas e lavadoras. Risco de ruptura e de efeito chicote nos pedidos dos varejistas.' },
    { id: 'E06', data: '2026-10-21', titulo: 'Campanha de phishing contra fornecedores do setor', fonte: 'CERT e parceiros', no: 'n_erp', sev: 'Baixa', status: 'Convertido', risco: 'R11',
      texto: 'E-mails falsos se passam por clientes e pedem troca de dados bancários. Procedimento de dupla validação já está em vigor.' },
    { id: 'E07', data: '2026-10-18', titulo: 'Tufão previsto no Mar da China Meridional pode fechar Yantian por 48h', fonte: 'Serviço meteorológico', no: 'n_chip', sev: 'Baixa', status: 'Descartado', risco: 'R05',
      texto: 'A trajetória mudou e o porto operou normalmente.' },
  ],

  /* Fornecedores (inclui alternativos). gasto em R$ mil/ano; share = participação na categoria de compra. */
  suppliers: [
    { id: 'S01', nome: 'Shenzhen MicroTech', no: 'n_chip', pais: 'China', compra: 'Eletrônicos', gasto: 168000, share: 0.8, fonteUnica: true, z: 3.4, otif: 88, lead: 52, cvLead: 0.28, riscoPais: 4, ciber: 3, cert: 'ISO 9001, IATF 16949' },
    { id: 'S02', nome: 'Manaus EletroTec', no: null, pais: 'Brasil', compra: 'Eletrônicos', gasto: 42000, share: 0.2, fonteUnica: false, z: 2.7, otif: 93, lead: 21, cvLead: 0.15, riscoPais: 2, ciber: 3, cert: 'ISO 9001 (em qualificação)' },
    { id: 'S03', nome: 'Wuxi Compressores', no: 'n_comp', pais: 'China', compra: 'Compressores', gasto: 96000, share: 0.85, fonteUnica: false, z: 3.1, otif: 91, lead: 48, cvLead: 0.22, riscoPais: 4, ciber: 2, cert: 'ISO 9001, ISO 14001' },
    { id: 'S04', nome: 'Joinville Compressores', no: null, pais: 'Brasil', compra: 'Compressores', gasto: 17000, share: 0.15, fonteUnica: false, z: 3.6, otif: 97, lead: 12, cvLead: 0.08, riscoPais: 2, ciber: 2, cert: 'ISO 9001, ISO 14001' },
    { id: 'S05', nome: 'Siderúrgica Vale do Aço', no: 'n_aco', pais: 'Brasil', compra: 'Aço', gasto: 118000, share: 0.7, fonteUnica: false, z: 3.3, otif: 95, lead: 9, cvLead: 0.12, riscoPais: 2, ciber: 2, cert: 'ISO 9001' },
    { id: 'S06', nome: 'Aços do Pecém', no: null, pais: 'Brasil', compra: 'Aço', gasto: 51000, share: 0.3, fonteUnica: false, z: 2.9, otif: 94, lead: 6, cvLead: 0.1, riscoPais: 2, ciber: 2, cert: 'ISO 9001' },
    { id: 'S07', nome: 'MotorSul', no: 'n_motor', pais: 'Brasil', compra: 'Motores', gasto: 64000, share: 1, fonteUnica: true, z: 1.95, otif: 92, lead: 14, cvLead: 0.18, riscoPais: 2, ciber: 3, cert: 'ISO 9001' },
    { id: 'S08', nome: 'Plastnor Injetados', no: 'n_plast', pais: 'Brasil', compra: 'Plásticos', gasto: 73000, share: 0.6, fonteUnica: false, z: 2.6, otif: 96, lead: 2, cvLead: 0.2, riscoPais: 2, ciber: 3, cert: 'ISO 9001' },
    { id: 'S09', nome: 'Injeplast Paulista', no: null, pais: 'Brasil', compra: 'Plásticos', gasto: 49000, share: 0.4, fonteUnica: false, z: 3.2, otif: 93, lead: 8, cvLead: 0.14, riscoPais: 2, ciber: 2, cert: 'ISO 9001, ISO 14001' },
    { id: 'S10', nome: 'Embalagens Guararapes', no: 'n_emb', pais: 'Brasil', compra: 'Embalagens', gasto: 28000, share: 0.55, fonteUnica: false, z: 3.0, otif: 98, lead: 3, cvLead: 0.1, riscoPais: 2, ciber: 1, cert: 'FSC' },
    { id: 'S11', nome: 'Papelão Capibaribe', no: null, pais: 'Brasil', compra: 'Embalagens', gasto: 23000, share: 0.45, fonteUnica: false, z: 2.5, otif: 95, lead: 4, cvLead: 0.12, riscoPais: 2, ciber: 1, cert: 'FSC' },
    { id: 'S12', nome: 'Formosa Wafer Foundry (nível 2)', no: 'n_wafer', pais: 'Taiwan', compra: 'Wafers (nível 2)', gasto: 0, share: 1, fonteUnica: true, z: 4.2, otif: 95, lead: 70, cvLead: 0.25, riscoPais: 4, ciber: 2, cert: 'ISO 9001, IATF 16949' },
  ],
  pesos: { financeiro: 20, dependencia: 25, desempenho: 20, geografico: 15, leadtime: 10, ciber: 10 },

  /* Autoavaliação dos dez princípios (0–4) */
  principios: [
    { nota: 3, evidencia: 'Auditorias internas de qualidade e segurança em dia; plano de manutenção preditiva em implantação.' },
    { nota: 2, evidencia: 'Segunda fonte qualificada em aço, plásticos e embalagens; eletrônicos e motores ainda concentrados.' },
    { nota: 2, evidencia: 'Análise TTR/TTS feita em 2026 identificou o fornecedor de placas como elo mais fraco; ação em andamento.' },
    { nota: 3, evidencia: 'Sprinklers, brigada, MFA e escolta de cargas já implantados.' },
    { nota: 1, evidencia: 'Plastnor e ERP com cobertura menor que o tempo de recuperação; política de estoque zero em plásticos.' },
    { nota: 2, evidencia: 'Estoques estratégicos em placas e compressores; capacidade reserva inexistente na fábrica única.' },
    { nota: 2, evidencia: 'CPFR iniciado com 2 dos 5 maiores clientes; fornecedores não compartilham dados de nível 2.' },
    { nota: 3, evidencia: 'Comitê de crise e planos de contingência para porto, chuvas e TI.' },
    { nota: 1, evidencia: 'Redesenho modular da placa ainda planejado; produtos usam componentes dedicados.' },
    { nota: 3, evidencia: 'Inspeção por amostragem, CEP nas linhas e auditoria na origem em fornecedores críticos.' },
  ],
});

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'eco.db');
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    for (const ext of ['-wal', '-shm']) {
        const p = DB_PATH + ext;
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    console.log('DB precedente rimosso.');
}

const db = require('../server/db');
const { newId, now } = require('../server/utils/helpers');
const t0 = now();

function estimateCo2(category, ecoScore) {
    const base = { 'Igiene': 0.3, 'Casa': 0.6, 'Cucina': 0.5, 'Abbigliamento': 1.4 };
    return Math.round(((base[category] || 0.4) * (ecoScore / 10) * 1.5) * 100) / 100;
}

const productsData = [
    { id: 'p001', name: 'Spazzolino in bambù',           category: 'Igiene',        price:  3.50, stock: 120, ecoScore:  9, img: 'img/Spazzolino.png',
      description: 'Spazzolino con manico in bambù 100% compostabile. Setole in nylon riciclato. Un\'alternativa durevole alla plastica.' },
    { id: 'p002', name: 'Borraccia in acciaio 500ml',    category: 'Casa',          price: 14.90, stock:  80, ecoScore: 10, img: 'img/Borraccia.png',
      description: 'Borraccia termica in acciaio inox 18/8. Mantiene le bevande calde 12h e fredde 24h. Evita centinaia di bottiglie di plastica all\'anno.' },
    { id: 'p003', name: 'Shampoo solido naturale',       category: 'Igiene',        price:  8.00, stock:  60, ecoScore:  9, img: 'img/Shampoo.png',
      description: 'Panetto di shampoo solido senza SLS, senza parabeni, senza packaging in plastica. Equivale a 2 flaconi da 250ml.' },
    { id: 'p004', name: 'Sacchetto spesa in cotone bio', category: 'Casa',          price:  4.90, stock: 200, ecoScore:  8, img: 'img/Shopper.png',
      description: 'Shopper in cotone biologico certificato GOTS. Lavabile, resistente fino a 10 kg. Chiusura con laccetto.' },
    { id: 'p005', name: 'Candela in cera di soia',       category: 'Casa',          price: 12.50, stock:  45, ecoScore:  7, img: 'img/Candela.png',
      description: 'Candela profumata in cera di soia e oli essenziali. Stoppino in cotone non trattato. Contenitore in vetro riutilizzabile.' },
    { id: 'p006', name: 'Maglietta in cotone riciclato', category: 'Abbigliamento', price: 22.00, stock:  35, ecoScore:  8, img: 'img/T-Shirt.png',
      description: 'T-shirt unisex realizzata con cotone riciclato al 60% e cotone biologico al 40%. Tinture naturali.' },
    { id: 'p007', name: 'Kit posate in bambù da viaggio',category: 'Cucina',        price:  9.90, stock:  90, ecoScore:  9, img: 'img/Posate.png',
      description: 'Set di posate in bambù con custodia in cotone: forchetta, coltello, cucchiaio, bacchette, cannuccia e spazzolino.' },
    { id: 'p008', name: 'Pellicola alimentare in cera d\'api', category: 'Cucina', price: 11.00, stock:  70, ecoScore: 10, img: 'img/Pellicola.png',
      description: 'Set di 3 pellicole riutilizzabili in cotone, cera d\'api e resina di pino. Alternativa ecologica al cellophane. Durata: 1 anno.' },

    { name: 'Detersivo lavatrice ecologico', category: 'Casa',          price: 9.50, stock:  70, ecoScore: 9, img: 'img/Detersivo.png',
      description: 'Detersivo concentrato 100% biodegradabile, in flacone di plastica riciclata. 30 lavaggi.' },
    { name: 'Sapone solido naturale',        category: 'Igiene',        price: 5.20, stock: 110, ecoScore: 9, img: 'img/Sapone.png',
      description: 'Sapone vegetale fatto a mano, profumato con oli essenziali, senza imballaggio.' },
    { name: 'Tazza in bambù',                category: 'Cucina',        price: 6.80, stock:  90, ecoScore: 8, img: 'img/Tazza.png',
      description: 'Tazza per asporto in fibra di bambù, con coperchio in silicone alimentare.' },
    { name: 'Calzini in cotone bio',         category: 'Abbigliamento', price: 7.00, stock:  50, ecoScore: 7, img: 'img/Calzini.png',
      description: 'Pacchetto da 3 paia di calzini in cotone biologico certificato.' },
    { name: 'Spugne lavabili in luffa',      category: 'Cucina',        price: 4.50, stock: 130, ecoScore: 9, img: 'img/Spugne.png',
      description: 'Set di 3 spugne naturali in fibra di luffa. 100% compostabili a fine vita.' }
];

const insP = db.prepare(`
    INSERT INTO products (id, name, category, price, stock, eco_score, co2_saved,
                          description, img, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of productsData) {
    insP.run(p.id || newId('p'), p.name, p.category, p.price, p.stock, p.ecoScore,
             estimateCo2(p.category, p.ecoScore),
             p.description, p.img, t0, t0);
}
console.log(`Inseriti ${productsData.length} prodotti`);

const usersData = [
    { id: 'u_admin',     username: 'admin',     email: 'admin@eco-nomico.it',  password: 'admin123', role: 'admin', eco_points: 1000, avatar: null, bio: 'Amministratore della piattaforma' },
    { id: 'u_giulia',    username: 'Giulia',    email: 'giulia@example.com',   password: 'demo1234', role: 'user',  eco_points:  250, avatar: null, bio: 'Appassionata di vita zero-waste e fai-da-te.' },
    { id: 'u_marco',     username: 'Marco',     email: 'marco@example.com',    password: 'demo1234', role: 'user',  eco_points:  130, avatar: null, bio: 'Compostaggio in balcone è il mio hobby.' },
    { id: 'u_sofia',     username: 'Sofia',     email: 'sofia@example.com',    password: 'demo1234', role: 'user',  eco_points:  410, avatar: null, bio: 'Moda sostenibile e armadio capsula.' },
    { id: 'u_luca',      username: 'Luca',      email: 'luca@example.com',     password: 'demo1234', role: 'user',  eco_points:  180, avatar: null, bio: 'Coltivo l\'orto sul terrazzo a Trastevere.' },
    { id: 'u_chiara',    username: 'Chiara',    email: 'chiara@example.com',   password: 'demo1234', role: 'user',  eco_points:  300, avatar: null, bio: 'Runner ecologica: scarpe riciclate, niente plastica.' },
    { id: 'u_andrea',    username: 'Andrea',    email: 'andrea@example.com',   password: 'demo1234', role: 'user',  eco_points:  520, avatar: null, bio: 'Riparo biciclette in una ciclofficina autogestita.' },
    { id: 'u_elena',     username: 'Elena',     email: 'elena@example.com',    password: 'demo1234', role: 'user',  eco_points:  210, avatar: null, bio: 'Maestra elementare, educazione ambientale dai 6 anni.' },
    { id: 'u_davide',    username: 'Davide',    email: 'davide@example.com',   password: 'demo1234', role: 'user',  eco_points:  340, avatar: null, bio: 'Cuoco vegano, ricette di stagione e a km zero.' },
    { id: 'u_francesca', username: 'Francesca', email: 'francesca@example.com',password: 'demo1234', role: 'user',  eco_points:  160, avatar: null, bio: 'Minimalismo applicato: meno cose, più tempo.' },
    { id: 'u_riccardo',  username: 'Riccardo',  email: 'riccardo@example.com', password: 'demo1234', role: 'user',  eco_points:  470, avatar: null, bio: 'Smart home a basso consumo, fotovoltaico fai-da-te.' },
    { id: 'u_martina',   username: 'Martina',   email: 'martina@example.com',  password: 'demo1234', role: 'user',  eco_points:   90, avatar: null, bio: 'Studentessa di scienze ambientali, attivista FFF.' },
    { id: 'u_stefano',   username: 'Stefano',   email: 'stefano@example.com',  password: 'demo1234', role: 'user',  eco_points:  280, avatar: null, bio: 'Pensionato falegname: recupero mobili abbandonati.' }
];

const insU = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, eco_points, avatar, bio, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

(async () => {
    for (const u of usersData) {
        const hash = await bcrypt.hash(u.password, 10);
        insU.run(u.id, u.username, u.email, hash, u.role, u.eco_points, u.avatar, u.bio, t0);
    }
    console.log(`Inseriti ${usersData.length} utenti (1 admin + ${usersData.length - 1} utenti)`);

    const postsData = [
        { id: 'post_1', author: 'u_giulia',    date: '2026-04-10T10:00:00.000Z',
          title: '5 modi per riutilizzare i barattoli di vetro',
          tags:  'riciclo,vetro,casa',
          content: `I barattoli di vetro delle conserve sono una miniera! Ecco le mie idee preferite:

1. Portacandele: basta versare cera d'avanzo e inserire uno stoppino.
2. Organizer per piccoli oggetti: bottoni, spille, viti.
3. Vasi per piantine grasse.
4. Bicchieri originali per feste.
5. Contenitori ermetici per la dispensa.

Voi come li usate?` },

        { id: 'post_2', author: 'u_marco',     date: '2026-04-12T14:30:00.000Z',
          title: 'Compostaggio in appartamento: si può fare!',
          tags:  'compost,appartamento,organico',
          content: 'Molti pensano che il compostaggio sia solo per chi ha il giardino, ma ci sono ottime soluzioni anche per un balcone o una cucina. Vermicompostiere e bokashi sono le mie preferite. Scrivetemi se volete dettagli!' },

        { id: 'post_3', author: 'u_giulia',    date: '2026-04-15T09:00:00.000Z',
          title: 'Spesa a km 0: dove trovare i mercati contadini',
          tags:  'cibo,locale,kmzero',
          content: `Comprare frutta e verdura direttamente dai produttori locali ha tre vantaggi enormi:

1. Meno trasporti = meno CO₂.
2. Prodotti più freschi e di stagione.
3. Si supporta l'economia del territorio.

In molte città c'è un mercato contadino ogni settimana. Cercate "mercato della terra Slow Food" + nome città.` },

        { id: 'post_4', author: 'u_marco',     date: '2026-04-18T16:45:00.000Z',
          title: 'Pulizie naturali: aceto + bicarbonato bastano davvero?',
          tags:  'pulizie,naturale,casa,risparmio',
          content: 'In casa mia da 6 mesi non compro più sgrassatori chimici. Aceto bianco per i vetri, bicarbonato per le superfici grasse, limone per il calcare. Spendo 5 € al mese e l\'aria di casa è più pulita. Esperienze simili?' },

        { id: 'post_5', author: 'u_andrea',    date: '2026-04-19T11:20:00.000Z',
          title: 'Aggiusta, non buttare: la mia esperienza in ciclofficina',
          tags:  'riparazione,bici,riuso',
          content: 'In due anni di volontariato in una ciclofficina abbiamo rimesso in strada più di 400 biciclette destinate alla discarica. Il 90% dei guasti si risolve con 10 € di pezzi e mezz\'ora di lavoro. Cercate la ciclofficina più vicina, anche solo per imparare!' },

        { id: 'post_6', author: 'u_davide',    date: '2026-04-20T19:10:00.000Z',
          title: 'Ricetta: polpette di lenticchie e zucca (zero sprechi)',
          tags:  'cucina,vegan,ricette',
          content: `Una ricetta perfetta per usare la zucca avanzata e i legumi secchi. Ingredienti per 4 persone:

- 200 g lenticchie cotte
- 300 g zucca al forno
- 4 cucchiai di pangrattato (anche dal pane raffermo!)
- erbe a piacere

Frullate, formate le polpette, 20 minuti in forno a 180°. Buonissime!` },

        { id: 'post_7', author: 'u_riccardo',  date: '2026-04-22T08:30:00.000Z',
          title: 'Quanto consuma davvero la modalità stand-by?',
          tags:  'energia,risparmio,tech',
          content: 'Ho misurato con un wattmetro tutti gli apparecchi di casa in stand-by: TV, decoder, console, router, microonde. Totale: 38 W in stand-by H24 = circa 90 € l\'anno. Una multipresa con interruttore risolve metà del problema in 10 minuti.' },

        { id: 'post_8', author: 'u_sofia',     date: '2026-04-24T15:00:00.000Z',
          title: 'Armadio capsula: 33 capi per 3 mesi',
          tags:  'moda,minimalismo,abbigliamento',
          content: 'Sto sperimentando il "Project 333": tre mesi con 33 capi di abbigliamento (scarpe e accessori inclusi). Risultato: meno stress al mattino, niente acquisti compulsivi e ho riscoperto vestiti che avevo dimenticato. Provateci.' }
    ];

    const insPost = db.prepare(`
        INSERT INTO posts (id, title, content, tags, author_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of postsData) {
        insPost.run(p.id, p.title, p.content, p.tags, p.author, p.date);
    }
    console.log(`Inseriti ${postsData.length} post community`);

    const likes = [
        ['post_1', 'u_marco'],   ['post_1', 'u_sofia'],    ['post_1', 'u_chiara'],
        ['post_2', 'u_giulia'],  ['post_2', 'u_luca'],     ['post_2', 'u_elena'],
        ['post_3', 'u_marco'],   ['post_3', 'u_davide'],   ['post_3', 'u_andrea'],
        ['post_4', 'u_giulia'],  ['post_4', 'u_francesca'],['post_4', 'u_stefano'],
        ['post_5', 'u_marco'],   ['post_5', 'u_riccardo'], ['post_5', 'u_martina'],
        ['post_6', 'u_giulia'],  ['post_6', 'u_chiara'],   ['post_6', 'u_elena'],
        ['post_7', 'u_andrea'],  ['post_7', 'u_stefano'],
        ['post_8', 'u_francesca'],['post_8', 'u_giulia'],  ['post_8', 'u_martina']
    ];
    const insLike = db.prepare(`INSERT INTO post_likes (post_id, user_id, liked_at) VALUES (?, ?, ?)`);
    for (const [pid, uid] of likes) insLike.run(pid, uid, t0);

    const comments = [
        ['post_1', 'u_marco',     'Bellissimi spunti! Io li uso anche come portasapone in cucina.'],
        ['post_1', 'u_chiara',    'Aggiungerei: ottimi come bicchieri per smoothie quando si esce.'],
        ['post_2', 'u_giulia',    'Mi spieghi il bokashi? Mai sentito.'],
        ['post_2', 'u_luca',      'Confermo, vermicompostiera in cucina da un anno: zero odori!'],
        ['post_4', 'u_giulia',    'Da quando uso questi tre ingredienti la mia famiglia ha smesso di tossire la mattina.'],
        ['post_5', 'u_riccardo',  'Iniziativa fantastica. Anche da noi a Roma c\'è qualcosa di simile?'],
        ['post_6', 'u_elena',     'Le proverò con i miei bambini a scuola, le adoreranno.'],
        ['post_7', 'u_stefano',   'Confermo i numeri. Da quando ho messo la multipresa con interruttore risparmio circa 80 € l\'anno.'],
        ['post_8', 'u_giulia',    'Ci sto pensando da mesi. Quale è stata la difficoltà più grande?']
    ];
    const insComm = db.prepare(`
        INSERT INTO comments (id, post_id, author_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    for (const [pid, uid, txt] of comments) insComm.run(newId('c'), pid, uid, txt, t0);
    console.log(`Inseriti ${likes.length} like e ${comments.length} commenti`);

    const reviews = [
        ['p001', 'u_giulia',    5, 'Ottimo prodotto',     'Lo uso da mesi, le setole reggono benissimo e il manico è elegante.'],
        ['p001', 'u_chiara',    4, 'Ben fatto',            'Buon prodotto, mi sarei aspettata setole un filo più morbide.'],
        ['p002', 'u_marco',     5, 'Borraccia perfetta',   'Mantiene davvero la temperatura per ore. Dieci e lode.'],
        ['p002', 'u_andrea',    5, 'Indistruttibile',      'L\'ho fatta cadere mille volte, neanche una ammaccatura.'],
        ['p003', 'u_giulia',    4, 'Buon shampoo',         'Profuma molto, lascia i capelli morbidi. Toglierei una stella per il prezzo.'],
        ['p003', 'u_sofia',     5, 'Mi ha conquistato',    'Capelli più sani in 3 settimane, addio bottiglie di plastica.'],
        ['p004', 'u_francesca', 5, 'Robustissimo',         'Lo uso ogni giorno per la spesa, regge senza problemi 8 kg.'],
        ['p005', 'u_elena',     4, 'Profumo delicato',     'Profumo gradevole e durata superiore alle candele tradizionali.'],
        ['p007', 'u_davide',    5, 'Sempre con me',        'Le porto in ufficio, niente più posate usa-e-getta.'],
        ['p008', 'u_luca',      5, 'Sostituiscono tutto',  'Da quando le uso ho eliminato pellicola e alluminio dalla cucina.']
    ];
    const insRev = db.prepare(`
        INSERT INTO reviews (id, product_id, user_id, rating, title, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [prod, user, rate, title, txt] of reviews) {
        insRev.run(newId('rev'), prod, user, rate, title, txt, t0);
    }
    console.log(`Inserite ${reviews.length} recensioni`);

    const coupons = [
        { code: 'WELCOME10', description: 'Sconto del 10% per nuovi utenti', discount_pct: 10, min_total:  0, max_uses:   0, valid_until: '2027-12-31T23:59:59Z' },
        { code: 'GREEN20',   description: 'Sconto del 20% sopra i 30 €',     discount_pct: 20, min_total: 30, max_uses: 100, valid_until: '2026-12-31T23:59:59Z' },
        { code: 'ECO5',      description: 'Sconto fisso del 5%',             discount_pct:  5, min_total:  0, max_uses:   0, valid_until: null }
    ];
    const insC = db.prepare(`
        INSERT INTO coupons (code, description, discount_pct, min_total, max_uses, valid_until, active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    for (const c of coupons) {
        insC.run(c.code, c.description, c.discount_pct, c.min_total, c.max_uses, c.valid_until);
    }
    console.log(`Inseriti ${coupons.length} coupon`);

    console.log('');
    console.log('Seed completato.');
    console.log('');
    console.log('Credenziali principali:');
    console.log('  admin / admin123    (amministratore)');
    console.log('  Giulia / demo1234   (utente con post + recensioni)');
    console.log('  Marco  / demo1234   (utente con post + recensioni)');
    console.log('');
    console.log('Altri utenti (tutti con password "demo1234"):');
    console.log('  Sofia, Luca, Chiara, Andrea, Elena,');
    console.log('  Davide, Francesca, Riccardo, Martina, Stefano');
    console.log('');
    console.log('Coupon disponibili: WELCOME10, GREEN20, ECO5');
    console.log('');

    db.close();
})();

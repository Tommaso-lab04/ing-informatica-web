# Eco-Nomico

E-commerce di prodotti eco-sostenibili con sistema di **gamification** (eco-points,
CO₂ risparmiata) e una **community** di riciclo. Backend REST in Node.js/Express su
database SQLite, con autenticazione, gestione ordini transazionale e feed XML/XSL.

> Progetto del corso *Tecnologie e Sistemi Web* — Sapienza Università di Roma,
> a.a. 2025/2026. Lavoro di gruppo.

---

## Caratteristiche

- **Catalogo prodotti** con categorie, ricerca/filtri, recensioni e punteggio ecologico.
- **Carrello e wishlist** per utente.
- **Gestione ordini transazionale**: creazione ordine atomica con scalo dello stock,
  validazione e applicazione coupon, assegnazione di punti fedeltà e calcolo della CO₂
  risparmiata; cancellazione ordine con ripristino dello stock.
- **Autenticazione a sessione** con password hashate e controllo accessi per ruoli
  (utente / amministratore).
- **Area amministrazione**: gestione prodotti, stato ordini, log delle azioni admin.
- **Community**: post, like e commenti.
- **Coupon** sconto e iscrizione **newsletter**.
- **Feed XML/XSL, RSS e sitemap** generati lato server.

## Stack tecnologico

- **Runtime:** Node.js (≥ 18)
- **Framework:** Express
- **Database:** SQLite (`better-sqlite3`)
- **Auth & sicurezza:** `express-session`, `bcryptjs`, `express-rate-limit`,
  `cookie-parser`
- **Frontend:** HTML statico + CSS + JavaScript vanilla (cartella `public/`)

## Avvio rapido

**Prerequisiti:** Node.js ≥ 18.

```bash
git clone <url-del-repo>
cd eco-nomico

# Installa le dipendenze
npm install

# Crea e popola il database con dati di esempio
npm run seed

# Avvia il server
npm start
```

Il sito è quindi raggiungibile su **http://localhost:3000** (porta di default).

Script disponibili:

| Comando         | Descrizione                                        |
|-----------------|----------------------------------------------------|
| `npm start`     | Avvia il server                                    |
| `npm run dev`   | Avvio in modalità watch (riavvio automatico)       |
| `npm run seed`  | (Ri)crea il database e lo popola con dati demo     |
| `npm run reset` | Azzera il database                                 |

## Modello dei dati

Database SQLite con schema relazionale **normalizzato**, vincoli di integrità referenziale
(`FOREIGN KEY ... ON DELETE CASCADE`) e indici sulle colonne di lookup più frequenti
(categoria e prezzo prodotti, username/email utenti, utente/stato ordini, ecc.).

| Tabella        | Contenuto                                        |
|----------------|--------------------------------------------------|
| `users`        | Account, ruolo, eco-points, profilo              |
| `products`     | Catalogo, prezzo, stock, punteggio eco, CO₂      |
| `reviews`      | Recensioni prodotto                              |
| `cart_items`   | Articoli nel carrello per utente                 |
| `wishlist`     | Lista desideri per utente                        |
| `coupons`      | Codici sconto e relative regole                  |
| `orders`       | Ordini (totale, sconto, coupon, stato, CO₂)      |
| `order_items`  | Righe d'ordine                                   |
| `posts`        | Post della community                             |
| `post_likes`   | Like ai post                                     |
| `comments`     | Commenti ai post                                 |
| `newsletter`   | Iscrizioni newsletter                            |
| `admin_log`    | Log delle azioni amministrative                  |

## API REST

API organizzata in moduli di route separati, montati sotto `/api`:

| Prefisso              | Responsabilità                                          |
|-----------------------|---------------------------------------------------------|
| `/api/auth`           | Registrazione, login, logout, cambio password, `/me`    |
| `/api/products`       | Catalogo, dettaglio, categorie, recensioni (+ CRUD admin)|
| `/api/cart`           | Gestione carrello                                       |
| `/api/orders`         | Creazione/elenco/dettaglio ordini, cancellazione, stato |
| `/api/wishlist`       | Lista desideri                                          |
| `/api/coupons`        | Validazione e applicazione coupon                       |
| `/api/community`      | Post, like, commenti                                    |
| `/api/newsletter`     | Iscrizione newsletter                                   |
| `/api/stats`          | Statistiche                                             |
| `/api/admin`          | Funzioni di amministrazione                             |

## Sicurezza

- **Password hashate** con bcrypt (mai in chiaro nel database).
- **Sessioni** gestite con `express-session`; cookie firmati.
- **Controllo accessi per ruoli** tramite middleware (`requireAuth`, `requireAdmin`)
  e caricamento dell'utente corrente a ogni richiesta (`loadUser`).
- **Rate limiting** sugli endpoint sensibili di login e registrazione.
- **Limiti sulla dimensione del body** delle richieste e gestione centralizzata degli
  errori.

## Feed XML/XSL

Oltre alle API JSON, il server espone i dati anche in formato XML:

| Endpoint         | Descrizione                                          |
|------------------|------------------------------------------------------|
| `/products.xml`  | Catalogo in XML con foglio di stile **XSL** associato |
| `/orders.xml`    | Ordini dell'utente autenticato                        |
| `/rss.xml`       | Feed RSS                                              |
| `/sitemap.xml`   | Sitemap del sito                                      |

## Struttura del repository

```
.
├── package.json
├── server/
│   ├── server.js            # bootstrap Express, middleware globali, routing
│   ├── db.js                # connessione SQLite + definizione schema
│   ├── middleware/
│   │   └── auth.js          # loadUser, requireAuth, requireAdmin
│   ├── utils/
│   │   └── helpers.js
│   └── routes/              # auth, products, cart, orders, community,
│                            # wishlist, coupons, newsletter, stats, admin, xml
├── public/                  # frontend statico (HTML, CSS, JS, immagini, XSL)
└── scripts/
    ├── seed.js              # crea e popola il DB con dati demo
    └── reset.js             # azzera il DB
```

---

*Progetto universitario a scopo didattico.*

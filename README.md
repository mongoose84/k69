# K69

Online-udgave af drukspillet K69 — brættet fra Tinglev. 38 felter, én pit med
seks pladser, ét tårn, en kortbunke og Meier.

Ingen konto og ingen adgangskode: man opretter et spil, deler linket, skriver et
navn og er med — også når spillet allerede er i gang. Reglerne håndhæves af
serveren, ikke af god vilje.

```
docker compose up --build     # hele stakken på http://localhost:8080
```

Telefoner får mobil-appen, alt andet får web-appen. Vil man se den anden med
vilje, lægger man `?klient=mobil` eller `?klient=web` på adressen — valget
huskes i en cookie.

## Sådan hænger det sammen

```
kant (nginx)  ──┬── web    (nginx + React)      desktop
                ├── mobil  (nginx + React)      telefon
                └── api    (Fastify + ws)  ──   db (Postgres)
```

Fire images, ét compose-projekt. `kant` er den eneste der lytter udadtil; den
sender `/api` og `/ws` videre til backenden og resten til den frontend der
passer til enheden. Frontendene har hver deres nginx, så de også kan køre alene
bag en anden proxy.

| Mappe | Hvad |
| --- | --- |
| `packages/rules` | Regelmotoren. Brættets geometri, felterne, kortene, Meier-stigen og hele spillogikken. Ingen afhængigheder, 40 tests. |
| `packages/ui` | Delte React-dele: brættet som SVG med bordet i midten, terning, glas, hold-knap, handlingskortet, fejringen og websocket-klienten. |
| `apps/api` | Fastify + WebSocket + Postgres. Ejer tilstanden og afviser alt der ikke følger reglerne. |
| `apps/web` | Desktop-frontend (Vite + React). |
| `apps/mobile` | Mobil-frontend (Vite + React). |

Regelmotoren er ren og deles af server og klienter. Serveren har sandheden —
klienten bruger den samme kode til at vise hvad der må lade sig gøre, så
knapperne og håndhævelsen aldrig kommer i utakt.

## Udvikling

```
npm install
npm test                  # regelmotorens tests
docker compose up -d db   # kun databasen
npm run dev               # api på :8080, web på :5173, mobil på :5174
```

Frontendene proxier `/api` og `/ws` videre til `:8080`, så alt kører på samme
origin — også i produktion. `npm run build` bygger det hele; `npm run typecheck`
tjekker typerne på tværs.

Databasen migreres automatisk når api'en starter (`apps/api/src/migrations/`).

## Udgivelse

Push til `main` kører `.github/workflows/docker-publish.yml`: først tests og
typecheck, så bygges `api`, `web` og `mobil` og skubbes til GitHub Container
Registry som `ghcr.io/<ejer>/k69/<image>:latest` (og `:main-<sha>`). `kant` og
`db` er stock-images og bygges ikke.

Vil man have serveren til at trække de nye images selv, sætter man to secrets
på repoet: `DEPLOY_WEBHOOK_URL` og `DEPLOY_WEBHOOK_SECRET`. Så kaldes hooket
med en `X-Hub-Signature-256`-signeret payload når alle tre images er ude.
Uden dem udgives images stadig — der sker bare ikke noget deploy.

## Sådan er reglerne læst

Feltrækkefølgen er aflæst felt for felt på fotoet af det originale bræt.
Tællingen passer med reglerne: 2 × 2-krone, 4 × 3 til..?, 3 × SKÅL, 1 × Bier
Meister, 3 × Go! Bier Meister, 5 × Øl i tårnet, 4 × Træk et kort, 2 × DRIK,
3 × Meier og 11 frifelter. Felt 1 er det første felt efter pitten ("3 til..?"),
og man rykker med uret.

**Slurken er den fælles enhed.** Én enhed er 11 slurke uanset hvad man drikker —
kun mængden bag en slurk skifter:

| Drik | 1 slurk | 1 enhed |
| --- | --- | --- |
| Pilsner 4,6% | 3 cl | 33 cl (11 shots à 3 cl, som reglerne selv regner) |
| Vin 12% | 1,4 cl | 15 cl (5 glas pr. flaske) |
| Whisky 40% | 0,4 cl | 4 cl |
| Egen drik | enhed ÷ 11 | det man selv skriver ind: navn, cl og procent |

Tårnet måles derfor også i slurke og vises omregnet til hver spillers egen drik.
Glasset er en halv liter, som reglerne siger — det løber over ved 50 cl i øl-mål
(`taarnKapacitetCl`).

**Det serveren håndhæver hårdt:** turen og rækkefølgen; at man ikke kan hoppe ud
som Bier Meister eller med øl i tårnet (og i hardcore kun fra et blankt felt);
at man ryger i pitten når en anden lander på ens felt, og selv slår om sin plads
— også når en ny rammer den plads man står på; at man arbejder sig ned mod
plads 1 og først kommer ud på felt 1; og at ingen kan handle uden for tur eller
springe et åbent punkt over. Den der har tårnet, spiller med imens og siger selv
til når det er bundet — knappen ligger fast i handlingskortet, uanset hvis tur
det er.
Meier-terningerne sendes kun til den der selv slog dem — får man bægeret rakt
over bordet, er meldingen alt hvad man har, og vil man vide mere, må man løfte.
Når nogen løfter, bliver slaget hele bordets: udfaldet ligger i `meierResultat`
indtil et nyt bæger sættes på bordet, og det er dét fejringen viser.

**Bordet midt på pladen:** kortbunken, tårnet og terningen ligger på én bred
plade der spænder over begge DRIK!-felter. Terningen er blank til der slås, tumler
i to sekunder (`useForsinketSpil` holder hele skærmen på det gamle spil imens,
så brikken først rykker når den er landet) og lander med spillerens farve som
ring. Det trukne kort vendes op ved siden af bunken og bliver liggende til
næste træk. Handlingskortet øverst til højre tager farve efter den der er på.
Kapløb, Emne, overløb og 2-kronen ender i `spil.fejring` — et kort hen over
pladen i fem sekunder (`FejringKort`), messing når nogen vandt, rust når nogen
tabte.

**Meier på skærmen:** duellen kører som et stort kort hen over spillepladen med
et bæger i stedet for en terning — pladen ligger dæmpet udenom, så man kan se
hvor man er. Terningerne kommer aldrig frem af sig selv: man holder fingeren
nede for at kigge under sit eget bæger, og bægeret løfter sig af filten når
runden afgøres. Kortet ligger i `packages/ui/src/Meier.tsx` og deles af web og
mobil.

### Husregler vi selv har valgt

Reglerne siger det ikke, så her er hvad koden gør. Alt sammen ligger ét sted og
er nemt at ændre.

- **Whiskyens mængde** (4 cl pr. enhed) er et gæt — `packages/rules/src/drinks.ts`.
- **Meier koster 3 slurke** at tabe, dobbelt på en Meyer. Kan sættes i lobbyen.
- **Maraton** (10'eren): den der trak, drikker 1 slurk, næste til venstre 2, og
  så videre rundt. Reglerne siger bare at man drikker til man må stoppe.
- **Dame og Konge**: man vælger ved tilmelding om man er med damerne eller
  herrerne — det ene, ikke begge, ikke ingen. Rammer 2 slurke.
- **3 til..?** må man også bruge på sig selv, hvis man vil være solidarisk.
- **7'eren og 8'eren** køres som et kapløb i appen: alle trykker, sidste mand
  drikker.
- **Pitten**: den der ryger i, slår selv om sin plads. Bliver man skubbet
  videre af en ny, slår man om igen men drikker ikke igen.
- **Tårnet spærrer ikke turen.** Reglerne siger at man springes over mens man
  bunder det; her spiller man med og trykker "Tårnet er bundet" når det er tomt.
  Det var dét der gjorde at den 2-kronen udpegede aldrig kom med igen.
- **2-kronen** kan appen ikke se — man siger selv om den røg i.
- **Kommer man for sent**, får man et ledigt frifelt og kommer med i turen
  bagest i rækken.

## Det appen ikke kan

Terningen på gulvet, skum i tårnet og om man rent faktisk drikker er stadig
noget I selv holder styr på. Der er en knap til straf-slurken når terningen
ryger ud over bordkanten.

Api'en holder de kørende spil i hukommelsen og skriver til Postgres med kort
forsinkelse — det er nødvendigt fordi tårnet fyldes med mange små opdateringer i
sekundet. Det forudsætter én api-instans pr. database. Skal der skaleres vandret,
er det dér LISTEN/NOTIFY eller en delt cache skal ind.

## Miljø

Kopiér `.env.example` til `.env` og skift adgangskoden til databasen. Variabler:
`PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `LOG_LEVEL`.

Frontendene henter data fra samme domæne som sig selv — nginx sender `/api` og
`/ws` videre. Ligger api'et et andet sted, sættes `VITE_API_URL` som
miljøvariabel på web- og mobil-containerne: et entrypoint-script skriver den
ind i `/config.js` ved start, og frontend læser den derfra. Ændringer i
variablen træder i kraft ved en genstart, uden at imaget skal bygges igen.
Kører api'et på et andet domæne, kan `CORS_ORIGIN` sættes på api-containeren
(kommasepareret liste af domæner); uden den reflekteres alle origins.

Designet ligger i `design/` — artboards og geometri-generatoren der blev brugt
til at tegne brættet efter fotoet.
`design/meier/` er Meier-bægeret, og `design/bordet/` er bordet i midten med
terning og kortbunke — begge bygget i koden (`node design/bordet/build.mjs`
bygger artboardsene om).

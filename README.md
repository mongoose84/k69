# K69

Online-udgave af drukspillet K69 — brættet fra Tinglev. 38 felter, én pit med
seks pladser, ét tårn, en kortbunke og Meier.

Ingen konto og ingen adgangskode: man opretter et spil, deler linket, skriver et
navn og er med. Reglerne håndhæves af serveren, ikke af god vilje.

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
| `packages/rules` | Regelmotoren. Brættets geometri, felterne, kortene, Meier-stigen og hele spillogikken. Ingen afhængigheder, 30 tests. |
| `packages/ui` | Delte React-dele: brættet som SVG, terning, glas, hold-knap, handlingskortet og websocket-klienten. |
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

Tårnet måles derfor også i slurke og vises omregnet til hver spillers egen drik.
Det løber over ved 16 slurke — et 0,5 l glas i øl-mål.

**Det serveren håndhæver hårdt:** turen og rækkefølgen; at man ikke kan hoppe ud
som Bier Meister eller med øl i tårnet (og i hardcore kun fra et blankt felt);
at ens tur springes over mens man tømmer tårnet; at man ryger i pitten når en
anden lander på ens felt; at man arbejder sig ned mod plads 1 og først kommer ud
på felt 1; og at ingen kan handle uden for tur eller springe et åbent punkt over.
Meier-terningerne sendes kun til den der har bægeret — resten af bordet ser
meldingerne.

### Husregler vi selv har valgt

Reglerne siger det ikke, så her er hvad koden gør. Alt sammen ligger ét sted og
er nemt at ændre.

- **Whiskyens mængde** (4 cl pr. enhed) er et gæt — `packages/rules/src/drinks.ts`.
- **Meier koster 3 slurke** at tabe, dobbelt på en Meyer. Kan sættes i lobbyen.
- **Maraton** (10'eren): den der trak, drikker 1 slurk, næste til venstre 2, og
  så videre rundt. Reglerne siger bare at man drikker til man må stoppe.
- **Dame og Konge**: man vælger selv ved tilmelding om man drikker med damerne,
  herrerne, begge eller ingen af delene. Rammer 2 slurke.
- **7'eren og 8'eren** køres som et kapløb i appen: alle trykker, sidste mand
  drikker.
- **Pit-placeringen** slår serveren automatisk, så turen ikke går i stå. Bliver
  man skubbet videre i pitten af en ny, drikker man ikke igen.
- **2-kronen** kan appen ikke se — man siger selv om den røg i.

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

Designet ligger i `design/` — artboards og geometri-generatoren der blev brugt
til at tegne brættet efter fotoet.

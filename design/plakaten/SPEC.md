# Plakaten — nyt visuelt design til K69

Opgave: giv web- og mobil-appen det nye udseende "Plakaten". Det er et **rent
visuelt redesign**. Spillogik, regler, tekster (bortset fra sprogrettelserne
nedenfor), dataflow og komponentstruktur bliver som de er.

- Lærred med alle skærme (kun ejeren kan åbne det, medmindre det deles):
  https://claude.ai/artifact/TMcMz8RJkywHvqGSimLwzr
- Samme skærme som filer i dette repo: `design/plakaten/mockups/*.dc.html`. Det
  er almindelig HTML med inline styles. Åbn dem eller læs dem for præcise mål og
  værdier. `{{…}}`, `<sc-if>`, `<sc-for>` og `<x-dc>` er mockup-skabelon og
  skal ikke med over.
- Grafik: `design/plakaten/assets/`.

Mockupsene viser **eksempeldata** (navne, runde 4, 21 cl i tårnet, felt-numre).
Brug appens rigtige data. Hvor en mockup er forenklet i forhold til appen (fx
viser Meier-skærmen kun seks meldinger), er det appen der gælder.

---

## 1. Retning

En stålblå plakat, men varm: lampelys på grunden, filt-korn, papir-paneler,
ravgul øl. Store råbende bogstaver (Anton) til overskrifter og knapper, Bodoni
Moda i kursiv til de fortællende linjer og tal, Karla til alt andet. Et kæmpe
nedtonet ord i baggrunden ("K69", "RUNDE 4", "KORT", "MEIER", "TÅRN") og
Krunk-elefanten stort og beskåret på de rolige skærme.

## 2. Farver

Ejerens tre farver er grundpaletten. Blæk og ravgul er de eneste tilføjelser.

| Navn | Hex | Brug |
| --- | --- | --- |
| Stålblå | `#8199b1` | Grunden overalt (lysnet fra `#5f7d9b`, så blæk-tekst når 4.5:1 overalt) |
| Lys | `#ced8e2` | Paneler, kort, sidebjælker, lys tekst på blæk |
| Mellem | `#bcc6d0` | Sekundære flader, valgte rækker, skillelinjer |
| Blæk | `#1b2733` | Al tekst på lyse og blå flader, primærknapper, kanter |
| Blæk-dyb | `#0f1821` | Brødtekst direkte på stålblå |
| Tekst-dæmpet | `#33475b` | Brødtekst på lyse paneler |
| Label | `#3f566d` | Små versal-labels på lyse paneler |
| Vandmærke | `#8fa5ba` | Det store baggrundsord |
| Kant-lys | `#9fb1c3` | Tynde kanter, "Øl i tårnet"-felter, dæmpet tekst på blæk |
| Input | `#e6ecf1` | Tekstfelter, glassets inderside |
| Øl | `#F2C060` → `#C4761A` | Kun øl. Skum `#F6EBD4` (uændret fra appens `Glas`) |

**Regel:** hvid eller lys tekst på den blå grund er for svag. Tekst direkte på den
blå grund er altid `#1b2733` eller `#0f1821`. Primærknapper er blæk med lys
tekst.

### Gradienter og tekstur

- **Grund (lampelys):**
  `radial-gradient(90% 75% at 28% 18%, #98adc2 0%, #8199b1 52%, #7791ac 100%)`
  Selv det mørkeste punkt (`#7791ac`) giver `#1b2733` 4.6:1.
- **Korn:** `assets/korn.svg` som gentaget baggrund i et lag over hele skærmen:
  `opacity: 0.12; mix-blend-mode: multiply; pointer-events: none`.
- **Paneler (papir):**
  `linear-gradient(180deg, #dce3ea 0%, #ced8e2 60%, #c6d1dc 100%)`, `border-radius: 12px`,
  `box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 2px 4px rgba(15,24,33,.18), 0 28px 60px rgba(15,24,33,.38)`.
- **Lampe over bordet** (bag spillepladen):
  `radial-gradient(55% 55% at 50% 48%, rgba(242,192,96,.16) 0%, rgba(242,192,96,0) 70%)`.

## 3. Typografi

| Rolle | Skrift | Eksempel |
| --- | --- | --- |
| Display | **Anton** 400, versaler | "K69", overskrifter, knapper, spilkode |
| Fortælling og tal | **Bodoni Moda** 500 kursiv (tal uden kursiv) | Lead-tekster, "21 cl", antal tømt |
| Brødtekst og UI | **Karla** 400–700 | Alt andet. Labels: 11–12px, 700, `letter-spacing: .18em`, versaler |

Google Fonts:
`family=Anton&family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,500&family=Karla:wght@400;500;600;700`

Bodoni Moda og Karla er allerede i `packages/ui/src/tokens.css`. Anton er ny.

## 4. Sådan det lægges ind

Appen er bygget på CSS-variabler i `packages/ui/src/tokens.css`. Omlæg dem først,
og ret derefter de hårdkodede farver.

| Variabel | Ny værdi |
| --- | --- |
| `--bg` | `#8199b1` (plus grund-gradienten på skærmenes rod) |
| `--panel` | `#ced8e2` |
| `--panel-2` | `#bcc6d0` |
| `--raise` | `#dce3ea` |
| `--line` | `#bcc6d0` |
| `--line-2` | `#9fb1c3` |
| `--ink` | `#1b2733` |
| `--ink-dim` | `#33475b` |
| `--ink-faint` | `#3f566d` |
| `--brass`, `--brass-lt` | `#1b2733` (accenter er blæk, ikke messing) |
| `--amber` | uændret `#E0A03C`, kun til øl |
| ny `--display` | `Anton, Impact, sans-serif` |
| `color-scheme` | `light` |

Bagefter skal alle hårdkodede hex-farver i `packages/ui/src/*.tsx`,
`apps/web/src/app.css` og `apps/mobile/src/app.css` gennemgås. Det gælder især
`Braet.tsx`, `Dele.tsx`, `Meier.tsx`, `Handlinger.tsx`, `Krone.tsx` og `Syver.tsx`,
som stadig har de grønne og messingfarvede værdier fra "mørk kro-luksus".
`grep -rn "#[0-9A-Fa-f]\{6\}"` finder dem.

`.mark` (den guld-gradient-tekst på "K69") bliver til Anton i blæk, uden gradient.

## 5. Elementer

**Krunk-elefanten.** Brug `Elefant` fra `packages/ui/src/Elefant.tsx` med de
**originale farver** fra `design/Krunk-Elefanten.svg`. Den må ikke farves om,
spejles eller vendes.
```css
--elefant-streg: #000000;
--elefant-fyld:  #e6e6e6;
--elefant-oeje:  #ffffff;
```
På mørke flader (kortbagside, Meier-bægeret) sidder den i en lys cirkel:
`radial-gradient(circle at 40% 35%, #dce3ea, #bcc6d0)`.

**Knapper.**
- Primær: baggrund `#1b2733`, tekst `#ced8e2`, Anton 20–26px versaler,
  `letter-spacing: .06em`, radius 3px, højde 56–64px.
- Sekundær: gennemsigtig eller `#ced8e2`, `2px solid #1b2733`.
- Alle knapper skal være mindst 44px høje.

**Faner** ("Start nyt spil" / "Deltag med kode"): Karla 14px 700 versaler. Den
aktive fane har en 3px blæk-understregning, den inaktive har farven `#4a6075`.
Under fanerne er der en linje på 1.5px i `#bcc6d0`.

**Mærkater** (BM, PIT 4, DIG, VÆRT, ALTID): Karla 9.5–10.5px 700,
`letter-spacing: .1em`. Fyldt blæk med lys tekst for status (BM, VÆRT). Kun med
blæk-kant for info (DIG, PIT, ALTID).

**Brikker.** Behold spillerfarverne. Tilføj en kant på `2.5px solid #1b2733` og
dybde som i appens `Brik`:
`box-shadow: inset 0 -3px 5px rgba(0,0,0,.3), inset 0 2px 3px rgba(255,255,255,.35), 0 2px 4px rgba(15,24,33,.35)`.
Den spiller, der har turen, får desuden ringe og en glød:
`0 0 0 4px #ced8e2, 0 0 0 6px #1b2733, 0 0 24px 8px rgba(242,192,96,.55)`.

**Glas / tårnet.**
- Behold appens øl, skum og fyld-logik i `Glas`.
- Glasset får baggrund `#e6ecf1` (på den store tårn-skærm
  `linear-gradient(90deg, #e6ecf1 0%, #f7f9fb 30%, #dfe6ed 100%)` som glans) og
  kanten `2.5–4px solid #1b2733`.
- Når tårnet løber over, bliver øllet mørkere ravgult (`#E8A04A` → `#A8561A`).
  Det bliver ikke rødt og ikke blåt.
- **Øllet er aldrig blåt.**

**Kortbagside.** Blæk `#1b2733` med `assets/daaser.svg` som mønster
(`background-size: 28px 28px`, gentaget). Det er små øldåser tone-i-tone, som
man først ser, når man kigger efter. Det må ikke gøres tydeligere. Elefanten
sidder i midten i den lyse cirkel. Kortets forside er `#ced8e2` med en 3px blæk-kant,
radius 16px og en hård skygge `10px 12px 0 #0f1821`. Rang og kulør står i Anton,
og røde kulører er `#a8423a`.

**Vandmærke-ord.** Anton, `#8fa5ba`, 120–560px, `aria-hidden`, placeret bag
indholdet og beskåret af skærmkanten.

## 6. Brættet

`assets/braet-plakat.svg` er brættet renderet i den nye stil. Det er lavet med
samme geometri som `design/board.mjs` / `Braet.tsx`, så det kan bruges som
facit. Ret farverne i `Braet.tsx` sådan her:

| Felt-type | Fyld | Tekst |
| --- | --- | --- |
| Frifelt | `#dfe6ed` (prik `#5f7d9b`, r 3.6) | — |
| 3 til..? | `#bcc6d0` | `#1b2733` |
| SKÅL! | `#ced8e2` | `#1b2733` |
| Bier Meister | `#1b2733` | `#ced8e2` |
| Go! Bier Meister | `#bcc6d0` | `#1b2733` |
| Øl i tårnet | `#9fb1c3` | `#1b2733` |
| Træk et kort | `#ced8e2` | `#1b2733` |
| DRIK! | `#1b2733` | `#ffffff` |
| Meier | `#bcc6d0` | `#1b2733` |
| 2-krone | `#ced8e2` | `#1b2733` |

- Felttekster er i Anton og versaler. Felterne har en kant på `1.6px #1b2733`.
  Banens yder- og inderkant er `3px #1b2733`.
- Banen: `linear-gradient` fra `#dfe6ed` til `#c3cfdb` (top til bund).
- Filten indeni: `radialGradient` med `#95abc1` → `#8199b1` (65%) → `#7791ac`.
  Ovenpå ligger kornet (`feTurbulence` 0.9 / 3 oktaver, alfa-slope 0.09), klippet
  til inderkanten.
- Skygge under banen: yderstien i `#0f1821`, opacity .45, forskudt (4, 14) og
  sløret med 9.
- Pitten: pladserne er `#ced8e2` med `2.4px #1b2733`, radius 4. Plads 1 er
  omvendt (blæk med lys tekst). Tallene står i Anton 28. Vejen ud er stiplet i
  blæk.
- Tårnets cirkel: `#dfe6ed` med `3px #1b2733`. Glasset ovenpå har ravgul øl.

Typen skal altid stå som tekst på feltet. Farven er aldrig det eneste signal.

## 7. Skærm for skærm

| Skærm | Kode | Mockup |
| --- | --- | --- |
| Forside | `apps/web/src/skaerme/Forside.tsx` | `Main.dc.html` |
| Kom med (tilmeld) | `apps/web/src/skaerme/Tilmeld.tsx` | `Tilmeld.dc.html` |
| Lobby | `apps/web/src/skaerme/Lobby.tsx` | `Lobby.dc.html` |
| Spillepladen | `apps/web/src/skaerme/Bord.tsx` + `packages/ui` | `Bord.dc.html` |
| Træk et kort | `packages/ui` (kort/handlinger) | `Kort.dc.html` |
| Meier | `packages/ui/src/Meier.tsx` | `Meier.dc.html` |
| Øl i tårnet | `packages/ui/src/Handlinger.tsx` (hold for at hælde) | `Taarn.dc.html` |
| Mobil forside | `apps/mobile/src/skaerme/Forside.tsx` | `MobilForside.dc.html` |
| Mobil spilleplade | `apps/mobile/src/skaerme/Bord.tsx` | `MobilBord.dc.html` |

Mobilens Tilmeld og Lobby har ingen egne mockups. Brug web-versionerne i en kolonne
med de samme komponenter.

Hovedpunkterne pr. skærm:

- **Forside:** kæmpe "K69"-vandmærke, elefanten stort nede i højre hjørne,
  overskriften "Ét tårn. En pit der gør ondt." i Anton 64, lead i Bodoni kursiv.
  Tallene 38 felter / 6 i pitten / 1–8 spillere står som piller i toppen. Opret-
  og deltag-panelet er et papirpanel nede til venstre.
- **Kom med:** spilkoden som vandmærke, "Mette, Jeppe og Sofie venter." (fra
  appens data) til venstre og formularen i et højt papirpanel til højre. Brikker
  er 48px, og taget brikker har opacity .25. Drik- og holdvalg er kort i
  `#bcc6d0`, og det valgte kort er blæk.
- **Lobby:** "Del linket. Hent glassene." Link-boksen er lys med blæk-kant og en
  blæk-knap "Kopiér". Koden står stort i Anton `#1b2733`, og spillerne er lyse
  kort i to kolonner. Husregler står i et papirpanel til højre, og knappen er
  "Start spillet".
- **Spillepladen:**
  - Topbar med blæk-kant forneden.
  - Tur-pillen er blæk.
  - Venstre og højre sidebjælke er `#ced8e2` med `2px` blæk-skillelinjer.
  - Handlingskortet øverst til højre er blæk.
  - Midten har "RUNDE N" som vandmærke, lampegløden og en lille elefant i
    hjørnet nede til højre.
- **Kort / Meier / Tårn:** store overlays i samme stil. Se mockupsene.
  - Meier-bægeret er blæk med glans og elefanten i en lys cirkel.
- **Mobil:** samme sprog.
  - Spillepladen viser et udsnit omkring ens egen brik og har knappen "Overblik".
  - Tårnet (glas og cl) står i topbaren.
  - Handlingskortet er blæk i bunden.

## 8. Sprog

Brug danske ord i UI'et.
- `apps/web/src/skaerme/Forside.tsx`: "Join med kode" → **"Deltag med kode"**
- `apps/mobile/src/skaerme/Forside.tsx`: "eller join med en kode" → **"eller deltag med en kode"**

Protokolnavne som `type: 'join'` bliver som de er. Det gælder kun synlig tekst.

## 9. Færdig når

- Alle skærme i tabellen i afsnit 7 er i Plakat-stil på både web og mobil.
- Der er ingen grønne eller messingfarvede rester (grep efter de gamle hex-værdier
  fra `tokens.css`).
- Elefanten vises i originale farver, uspejlet.
- Øl er ravgul overalt.
- Tekst på den blå grund er blæk, og kontrasten er mindst 4.5:1 for brødtekst.
- Eksisterende tests er grønne (`npm test`), og intet i `packages/rules` er ændret.
- `prefers-reduced-motion` respekteres stadig.

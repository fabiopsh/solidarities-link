# SoLi — Guida Setup Sviluppatore

> Questa guida descrive tutti i passaggi per configurare l'ambiente di sviluppo del progetto **Solidarities Link (SoLi)** da zero.

---

## Prerequisiti

Assicurati di avere installato:

| Software           | Versione minima | Verifica comando         |
| ------------------ | --------------- | ------------------------ |
| **Docker Desktop** | 24.x            | `docker --version`       |
| **Docker Compose** | 2.x             | `docker compose version` |
| **Java JDK**       | 21 (LTS)        | `java --version`         |
| **Node.js**        | 20.x LTS        | `node --version`         |
| **npm**            | 10.x            | `npm --version`          |
| **Git**            | 2.x             | `git --version`          |

> **Opzionale per lo sviluppo mobile:**
>
> | Software            | Note                                                           |
> | ------------------- | -------------------------------------------------------------- |
> | **Xcode**           | Per il simulatore iOS (solo macOS)                             |
> | **Android SDK CLI** | Per l'emulatore Android (installazione guidata alla sezione 5) |
> | **Expo Go**         | App da installare su dispositivo fisico (iOS/Android)          |

---

## 1. Clonare il Repository

```bash
git clone https://github.com/fabiopsh/solidarities-link.git
cd solidarities-link
```

---

## 2. Installare JDK 21 e configurare JAVA_HOME

Il backend utilizza **Java 21 (LTS)**. È necessario installare un JDK 21 e configurare la variabile d'ambiente `JAVA_HOME` affinché Maven e Quarkus funzionino correttamente.

> 💡 Consigliamo la distribuzione **Eclipse Temurin** (ex AdoptOpenJDK), ma qualsiasi distribuzione OpenJDK 21 è compatibile (es. Amazon Corretto, Oracle JDK, GraalVM).

### Windows

#### Opzione A — Installer grafico (consigliata)

1. Vai su [https://adoptium.net/temurin/releases/?version=21](https://adoptium.net/temurin/releases/?version=21)
2. Scarica il file `.msi` per **Windows x64**
3. Esegui l'installer e **assicurati di selezionare le opzioni**:
   - ✅ _Set JAVA_HOME variable_
   - ✅ _Add to PATH_
4. Completa l'installazione

> L'installer Temurin configura automaticamente `JAVA_HOME` e il `PATH`. Dopo l'installazione, **chiudi e riapri il terminale**.

#### Opzione B — winget (da terminale)

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

> ⚠️ Dopo l'installazione con `winget`, potrebbe essere necessario configurare `JAVA_HOME` manualmente (vedi sotto).

#### Configurazione manuale di JAVA_HOME (Windows)

Se `JAVA_HOME` non è stato impostato automaticamente dall'installer, configuralo tramite PowerShell:

```powershell
# 1. Trova il percorso esatto del JDK installato
#    (la versione nel nome della cartella cambia ad ogni aggiornamento!)
Get-ChildItem "C:\Program Files\Eclipse Adoptium\" | Select-Object -ExpandProperty FullName

# 2. Imposta JAVA_HOME con il percorso trovato al passo precedente
#    ⚠️ SOSTITUISCI il percorso con quello effettivo mostrato dal comando sopra!
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot", "User")

# 3. Aggiungi il bin di Java al PATH utente
$javaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$javaHome\bin", "User")
```

> ⚠️ **Importante:** le variabili impostate con `[Environment]::SetEnvironmentVariable` hanno effetto solo nei **nuovi terminali**. Per usarle subito nella sessione corrente, esegui anche:
>
> ```powershell
> $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
> $env:Path = "$env:JAVA_HOME\bin;$env:Path"
> ```
>
> In alternativa, **chiudi e riapri il terminale**.

In alternativa, puoi configurare le variabili d'ambiente tramite GUI:

1. Cerca **"Variabili d'ambiente"** nel menu Start → _Modifica le variabili d'ambiente relative al sistema_
2. Click su **Variabili d'ambiente…**
3. Nelle **Variabili utente**, click **Nuova…**:
   - Nome: `JAVA_HOME`
   - Valore: il percorso del JDK (es. `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot`)
4. Seleziona la variabile `Path` → **Modifica…** → **Nuovo** → aggiungi `%JAVA_HOME%\bin`
5. Click **OK** su tutte le finestre

### macOS

```bash
# Installa JDK 21 con Homebrew
brew install --cask temurin@21

# Aggiungi JAVA_HOME al profilo shell (~/.zshrc)
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

### Linux (Debian/Ubuntu)

```bash
# Installa JDK 21 (Eclipse Temurin)
sudo apt install -y wget apt-transport-https gpg
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo gpg --dearmor -o /usr/share/keyrings/adoptium.gpg
echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt update
sudo apt install -y temurin-21-jdk

# Aggiungi JAVA_HOME al profilo shell (~/.bashrc)
echo 'export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64' >> ~/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
source ~/.bashrc
```

### Verifica (tutti i sistemi)

```bash
java --version
# Deve mostrare: openjdk 21.x.x ...

echo $JAVA_HOME        # macOS/Linux
echo $env:JAVA_HOME    # Windows PowerShell
# Deve mostrare il percorso del JDK 21
```

> ✅ Se `java --version` mostra la versione 21 e `JAVA_HOME` punta alla cartella corretta, sei pronto per procedere.

---

## 3. Avviare l'Infrastruttura (PostgreSQL + Keycloak)

```bash
docker-compose up postgres keycloak
```

Questo comando avvia:

- **PostgreSQL 16** sulla porta `5433` (container `soli-postgres`)
- **Keycloak 26** sulla porta `8180` (container `soli-keycloak`)

> ⏳ Keycloak impiega ~30 secondi ad avviarsi. Attendi il messaggio `Keycloak started in development mode` nei log.

Al primo avvio, Keycloak importa automaticamente il file `keycloak/realm-export.json` che configura:

- Realm **soli**
- Client **soli-frontend** (web, pubblico, PKCE)
- Client **soli-mobile** (mobile, pubblico, PKCE)
- Client **soli-backend** (confidenziale)
- Ruoli: `volunteer`, `requester`, `caregiver`, `admin`
- Utente di test: `admin@soli.it` / `admin`

### Verifica

- Admin Console Keycloak: [http://localhost:8180](http://localhost:8180) → `admin` / `admin`
- Il realm **soli** deve apparire nella lista (dropdown in alto a sinistra)

---

## 4. Avviare il Backend (Quarkus)

```bash
cd soli-backend
./mvnw quarkus:dev
```

Il backend si avvia sulla porta **8080** in modalità dev (hot-reload automatico).

### Verifica

- Health check: [http://localhost:8080/q/health](http://localhost:8080/q/health) → deve restituire `UP`
- Dev UI Quarkus: [http://localhost:8080/q/dev](http://localhost:8080/q/dev)

> **Nota:** alla prima esecuzione, Maven scaricherà tutte le dipendenze (~2-5 minuti).

---

## 5. Avviare il Frontend Web (React + Vite)

```bash
cd soli-frontend
npm install
npm run dev
```

Il frontend si avvia sulla porta **5173** con Vite dev server (HMR abilitato).

### Verifica

- Apri [http://localhost:5173](http://localhost:5173) nel browser
- Dovresti vedere la pagina di login SoLi con gradiente teal
- Click "Accedi con Keycloak" → login con `admin@soli.it` / `admin` → redirect alla dashboard

---

## 6. Configurazione Emulatore Android — Solo Terminale

> Questa sezione configura l'emulatore Android **interamente da terminale**, senza bisogno di aprire Android Studio. Se usi un **dispositivo fisico** con l'app **Expo Go**, puoi saltare questa sezione.
>
> Le istruzioni coprono **macOS** e **Windows**. Segui i comandi relativi al tuo sistema operativo.

### 6.1 Installare i Command-Line Tools

Scarica e installa i command-line tools di Android nella cartella SDK.

#### macOS (zsh/bash)

```bash
# Crea la cartella SDK (se non esiste)
mkdir -p ~/Library/Android/sdk/cmdline-tools

# Scarica i command-line tools
curl -o /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip

# Installa nella posizione corretta
unzip -o /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extract
mv /tmp/cmdline-tools-extract/cmdline-tools ~/Library/Android/sdk/cmdline-tools/latest
rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-extract
```

#### Windows (PowerShell)

```powershell
# Crea la cartella SDK (se non esiste)
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools"

# Scarica i command-line tools
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile "$env:TEMP\cmdline-tools.zip"

# Estrai nella posizione corretta
Expand-Archive -Path "$env:TEMP\cmdline-tools.zip" -DestinationPath "$env:TEMP\cmdline-tools-extract" -Force
Move-Item -Force "$env:TEMP\cmdline-tools-extract\cmdline-tools" "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest"
Remove-Item -Recurse -Force "$env:TEMP\cmdline-tools.zip", "$env:TEMP\cmdline-tools-extract"
```

### 6.2 Configurare le Variabili d'Ambiente

#### macOS

Aggiungi queste righe al tuo `~/.zshrc`:

```bash
# Android SDK (per emulatore Android con Expo)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Poi ricarica il profilo:

```bash
source ~/.zshrc
```

#### Windows

Imposta le variabili d'ambiente tramite PowerShell (**esegui come Amministratore**):

```powershell
# Imposta ANDROID_HOME a livello di sistema
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")

# Aggiungi i tool al PATH utente
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPaths = "$androidHome\emulator;$androidHome\platform-tools;$androidHome\cmdline-tools\latest\bin"
[Environment]::SetEnvironmentVariable("Path", "$currentPath;$newPaths", "User")
```

> ⚠️ **Dopo aver impostato le variabili, chiudi e riapri il terminale** affinché le modifiche abbiano effetto.

#### Verifica (entrambi i sistemi)

```bash
sdkmanager --version   # deve mostrare la versione (es. 12.0)
```

### 6.3 Installare SDK, Emulatore e System Image

> ⏳ Il download della system image è di circa 1 GB — richiede tempo.

#### macOS

```bash
# Accetta le licenze
yes | sdkmanager --licenses

# Installa i componenti necessari (~2 GB di download)
sdkmanager --install \
  "platform-tools" \
  "emulator" \
  "platforms;android-35" \
  "system-images;android-35;google_apis;arm64-v8a"
```

#### Windows (PowerShell)

```powershell
# Accetta le licenze (rispondi 'y' a ogni prompt)
sdkmanager --licenses

# Installa i componenti necessari (~2 GB di download)
# NOTA: su Windows con CPU Intel/AMD, usa x86_64 invece di arm64-v8a
sdkmanager --install `
  "platform-tools" `
  "emulator" `
  "platforms;android-35" `
  "system-images;android-35;google_apis;x86_64"
```

> 💡 **Nota sulla system image:** macOS con Apple Silicon usa `arm64-v8a`, Windows con CPU Intel/AMD usa `x86_64`. Se hai un PC Windows con ARM (es. Surface Pro X), usa `arm64-v8a`.

### 6.4 Creare il Dispositivo Virtuale (AVD)

#### macOS

```bash
echo "no" | avdmanager create avd \
  -n soli-android \
  -k "system-images;android-35;google_apis;arm64-v8a" \
  -d "pixel_7"
```

Abilita la tastiera hardware (necessario per Expo):

```bash
sed -i '' 's/hw.keyboard = no/hw.keyboard = yes/' ~/.android/avd/soli-android.avd/config.ini
sed -i '' 's/hw.mainKeys = no/hw.mainKeys = yes/' ~/.android/avd/soli-android.avd/config.ini
```

#### Windows (PowerShell)

```powershell
echo "no" | avdmanager create avd `
  -n soli-android `
  -k "system-images;android-35;google_apis;x86_64" `
  -d "pixel_7"
```

Abilita la tastiera hardware (necessario per Expo):

```powershell
$configPath = "$env:USERPROFILE\.android\avd\soli-android.avd\config.ini"
(Get-Content $configPath) -replace 'hw.keyboard = no', 'hw.keyboard = yes' `
                          -replace 'hw.mainKeys = no', 'hw.mainKeys = yes' |
  Set-Content $configPath
```

Questo crea un AVD chiamato `soli-android` con profilo hardware Pixel 7 e Android 15.

### 6.5 Avviare l'Emulatore

```bash
emulator -avd soli-android
```

> 💡 **Tip:** L'emulatore deve essere **completamente avviato** (schermata Home visibile) prima di premere `a` nel terminale Expo.
>
> Per avviarlo in background:
>
> - **macOS:** `emulator -avd soli-android -no-window &`
> - **Windows:** `Start-Process emulator -ArgumentList "-avd soli-android -no-window"`

### 6.6 Verifica

In un altro terminale, controlla che il dispositivo sia visibile:

```bash
adb devices
```

L'output deve mostrare:

```
List of devices attached
emulator-5554   device
```

✅ Ora sei pronto per avviare l'app mobile con `npx expo start` e premere `a`.

---

## 7. Avviare il Frontend Mobile (React Native + Expo)

```bash
cd soli-mobile
npm install
npx expo start
```

Questo avvia il dev server Expo sulla porta **8081**.

### Eseguire su simulatore/dispositivo

| Piattaforma | Comando nel terminale Expo | Prerequisito                                                                             |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| iOS         | Premi `i`                  | Xcode installato                                                                         |
| Android     | Premi `a`                  | Emulatore attivo (vedi [sezione 6](#6-configurazione-emulatore-android--solo-terminale)) |
| Web         | Premi `w`                  | —                                                                                        |

### ⚠️ Configurazione Keycloak per Mobile

> **Attenzione:** Se hai avviato Keycloak per la prima volta **dopo** questo aggiornamento, il client `soli-mobile` avrà già le redirect URI giuste (grazie al file `realm-export.json`).
>
> Se invece il tuo database Keycloak esisteva già (hai avviato i container prima di ora), **devi aggiornare manualmente le _Valid redirect URIs_** per far funzionare la login (altrimenti otterrai l'errore `Invalid parameter: redirect_uri`):

1. Accedi alla **Admin Console** → [http://localhost:8180](http://localhost:8180)
2. Seleziona il realm **soli** e vai su **Clients** → **soli-mobile**
3. Nella sezione **Valid redirect URIs**, aggiungi:
   - `solimobile://callback`
   - `exp://127.0.0.1:8081/*`
   - `exp://localhost:8081/*`
   - `exp://10.0.2.2:8081/*`
   - `exp://<IL_TUO_IP_LAN>:8081/*`
      > 💡 Trova il tuo IP LAN (es. `192.168.1.71`) dal log nel terminale di Expo dove dice:
      > `🔑 SOLI Mobile Redirect URI: exp://<IP>:8081/--/callback`
4. Clicca **Save** in basso.

_(In questo modo l'app Expo si collegherà senza errori dal simulatore Android su Windows o macOS)._

### Verifica

- Dovresti vedere la schermata di login SoLi (gradiente teal, logo 🤝)
- Tap "Accedi con Keycloak" → si apre il browser → login → redirect all'app su homepage

---

## Riepilogo Porte

| Servizio        | Porta | URL                                                      |
| --------------- | ----- | -------------------------------------------------------- |
| PostgreSQL      | 5433  | `postgresql://soli:soli_password@localhost:5433/soli_db` |
| Keycloak        | 8180  | http://localhost:8180                                    |
| Backend Quarkus | 8080  | http://localhost:8080                                    |
| Frontend Web    | 5173  | http://localhost:5173                                    |
| Frontend Mobile | 8081  | Expo dev server                                          |

---

## Credenziali di Sviluppo

| Servizio               | Username        | Password        |
| ---------------------- | --------------- | --------------- |
| Keycloak Admin Console | `admin`         | `admin`         |
| Utente SOLI di test    | `admin@soli.it` | `admin`         |
| PostgreSQL             | `soli`          | `soli_password` |

---

## Struttura del Progetto

```
solidarities-link/
├── docker-compose.yml           # Orchestrazione PostgreSQL + Keycloak
├── keycloak/
│   ├── realm-export.json        # Configurazione realm (auto-import)
│   └── themes/soli/login/       # Tema personalizzato login Keycloak
├── soli-backend/                # API REST — Java 21, Quarkus 3.31
│   ├── pom.xml
│   └── src/main/java/it/soli/
├── soli-frontend/               # Web — React 19, Vite 7, MUI
│   ├── package.json
│   └── src/
├── soli-mobile/                 # Mobile — React Native 0.81, Expo 54
│   ├── package.json
│   ├── app.json
│   └── app/                     # File-based routing (expo-router)
└── soli-documentation/          # Documentazione di progetto
```

---

## Comandi di Riferimento Rapido

```bash
# Avvia infrastruttura
docker-compose up postgres keycloak

# Avvia backend (in un terminale separato)
cd soli-backend && ./mvnw quarkus:dev

# Avvia frontend web (in un terminale separato)
cd soli-frontend && npm run dev

# Avvia emulatore Android (in un terminale separato)
emulator -avd soli-android

# Avvia frontend mobile (in un terminale separato)
cd soli-mobile && npx expo start

# Ferma tutto
docker-compose down

# Reset completo (cancella anche il database)
docker-compose down && docker volume rm solidarities-link_postgres_data
```

---

## Troubleshooting

### Keycloak non si avvia

Attendi che PostgreSQL sia completamente pronto (healthcheck). Se persiste, controlla i log con:

```bash
docker logs soli-keycloak
```

### "Client not found" su Keycloak (dalla mobile app)

Il client `soli-mobile` non è stato importato. Segui la sezione "Configurazione Keycloak per Mobile" al punto 6.

### "Invalid parameter: redirect_uri" durante il login mobile

La redirect URI dell'app non corrisponde a quelle configurate su Keycloak. Controlla il log di Expo per la URI effettiva e aggiungila nelle **Valid redirect URIs** del client `soli-mobile`.

### Backend non si connette al database

Verifica che PostgreSQL sia attivo sulla porta 5433:

```bash
docker ps | grep soli-postgres
```

### Maven scarica dipendenze lentamente

È normale alla prima esecuzione. Le dipendenze vengono cachate in `~/.m2/repository` per le esecuzioni successive.

### Keycloak non raggiungibile dall'emulatore Android

L'emulatore Android **non** può accedere a `localhost` della macchina host — `localhost` nell'emulatore si riferisce all'emulatore stesso. La configurazione in `soli-mobile/config/auth.ts` gestisce questo automaticamente usando `10.0.2.2` (alias speciale Android per il loopback dell'host). Se usi un **dispositivo fisico**, devi sostituire l'URL con l'IP LAN della tua macchina (es. `http://192.168.1.x:8180`).

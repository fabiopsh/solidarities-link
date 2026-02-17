# SOLI - Solidarities Link 🤝

![Status](https://img.shields.io/badge/Status-Prototype-blue)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

> **"Il desiderio di aiutare incontra il bisogno in tempo reale."**

## 💡 Introduzione

**SoLi (Solidarities Link)** nasce dalla necessità di rispondere alle sfide della transizione sociale e della Smart City.
È un ecosistema digitale di **"mutuo aiuto di quartiere"** che sfrutta la tecnologia per ricostruire il tessuto sociale urbano. Il sistema funge da intermediario fiduciario tra chi ha bisogno (soggetti fragili, anziani) e chi può offrire tempo (Volontari Civici), abbattendo le barriere della diffidenza.

A differenza delle piattaforme di _Gig Economy_, SoLi non mercifica l'aiuto: adotta un modello ibrido di **Time Banking e Gamification** dove il "pagamento" è la relazione umana e la valorizzazione del tempo.

## 🎯 Obiettivi del Progetto

- **Ridurre il divario** tra chi aiuta e chi ha bisogno tramite notifiche in tempo reale.
- **Certificare il volontariato** informale garantendo sicurezza e tracciabilità.
- **Inclusione Sociale e Digitale**: facilitare l'accesso ai servizi anche per chi ha scarsa alfabetizzazione tecnologica.

## ✨ Funzionalità Principali

### 1. Matching Intelligente & Prossimità

Il core del sistema è un algoritmo di matching che assegna i task basandosi su quattro parametri fondamentali:

- **Prossimità Geografica:** Priorità ai volontari nel raggio d'azione per ridurre l'impatto ambientale.
- **Compatibilità:** Verifica delle competenze rispetto alla richiesta.
- **Disponibilità e Tutela:** Monitoraggio ore (max giornaliero) per evitare sovraccarico.
- **Rotazione Equa:** Distribuzione uniforme dei task.

### 2. Time Banking & Gamification

Il sistema non genera pagamenti in denaro. Al completamento di un servizio, il volontario matura **"Crediti SOLI"**.

- I crediti sono convertibili in premialità (buoni spesa, trasporti, cultura) offerti da sponsor locali.
- Il sistema esclude forme di arricchimento personale diretto (modello no-profit).

### 3. Integrazione AI & LLM (Soli Assistant)

Per garantire la massima accessibilità, SoLi integra moduli **Large Language Models (LLM)**:

- **No-UI per Anziani:** L'utente può fare richieste vocali in linguaggio naturale (es. "Ho bisogno di qualcuno per la spesa"). L'LLM estrae le entità e compila il form tecnico.
- **LLM-in-the-middle:** Un "giudice" AI modera le chat tra volontario e richiedente per prevenire truffe e bloccare contenuti inappropriati.

### 4. Sicurezza e Trust

- **Identità Certificata:** Integrazione con SPID/CIEid per la validazione dei profili.
- **Feedback e Trust Score:** Sistema di valutazione trasparente per mantenere alta la qualità del servizio.
- **Token/QR Code:** Validazione crittografica di inizio e fine servizio (Check-in/Check-out).

## 🛠️ Architettura Tecnica

Il progetto è sviluppato come prototipo modulare scalabile, seguendo i principi dei microservizi.

- **Backend:** API RESTful (OpenAPI 3.0).
- **Deployment:** Containerizzazione completa tramite **Docker** e orchestrazione via `docker-compose`.
- **Availability:** Progettato per alta disponibilità nelle ore diurne (servizio critico).

## 🚀 Catalogo Servizi

Il sistema gestisce diverse macro-categorie di "Micro-Task Solidali":

- 🚑 **Accompagnamento e Mobilità** (visite mediche, passeggiate)
- 📦 **Supporto Fisico Occasionale** (spesa pesante, piccoli lavori)
- 🤝 **Socialità e Compagnia**
- 🐕 **Pet Support** (dog walking)
- 📱 **Inclusione Digitale** (supporto configurazione smartphone)

## 👥 Team di Sviluppo

- **Fabio Piscitelli**
- **Federico Lombardi**
- **Francesco Polperio**
- **Andrei Mickel Victorino**

[cite_start][cite: 3]

---

_Progetto sviluppato per finalità accademiche e dimostrative (PoC)._

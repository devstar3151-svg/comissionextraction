import { GoogleGenAI, Type } from '@google/genai';
import { CommissionStatement } from '../types';

// Initialize the Gemini client
// Note: In a real app, ensure process.env.API_KEY is available in your build/runtime environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    metadata: {
      type: Type.OBJECT,
      properties: {
        assureur: { type: Type.STRING, description: "GENERALI | ABEILLE | AXA | CARDIF | MMA" },
        cabinet_beneficiaire: { type: Type.STRING, description: "ex: VALETYS, ID PATRIMOINE, ID PRO SPORT, LINARD CHARBONNEL" },
        reference_bordereau: { type: Type.STRING },
        code_apporteur: { type: Type.STRING, description: "ex: 11 13700 G84002, BEZIERS, 117917..." },
        date_debut_periode: { type: Type.STRING, description: "DD/MM/YYYY" },
        date_fin_periode: { type: Type.STRING, description: "DD/MM/YYYY" },
        montant_total_paye: { type: Type.NUMBER }
      }
    },
    commissions_extraites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          client_nom_prenom: { type: Type.STRING },
          numero_contrat: { type: Type.STRING, description: "nettoyé du zero initial" },
          produit_nom: { type: Type.STRING, description: "ex: Cardif Elite, SENSEO, ADIF OPTIMUM" },
          support_actif: { type: Type.STRING, description: "EURO | OPCVM | PRIVATE_EQUITY | SCPI | STRUCTURE" },
          nature_commission: { type: Type.STRING, description: "ACQUISITION | ENCOURS | REPRISE" },
          detail_reporting_cible: { type: Type.STRING, description: "doit correspondre EXACTEMENT à l'une des catégories cibles" },
          montant_net: { type: Type.NUMBER, description: "valeur négative si c'est une reprise/avoir" }
        }
      }
    }
  }
};

export const extractCommissionData = async (base64Pdf: string): Promise<CommissionStatement> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              text: `# ROLE ET MISSION
Tu es un agent expert en comptabilité d'assurance et en réconciliation de commissions pour un cabinet de CGP (Conseiller en Gestion de Patrimoine). 
Ton objectif est d'analyser le document PDF fourni (bordereau de commission ou facture d'assureur) pour en extraire, nettoyer, classifier et structurer chaque ligne de commission au centime près.
Tu dois renvoyer le résultat sous la forme d'un objet JSON unique et structuré, prêt à être inséré dans une base de données pour alimenter un tableau de bord de reporting.

---

# ETAPE 1 : IDENTIFICATION DU PROTOCOLE DE L'ASSUREUR
Analyse la première page du document pour identifier l'assureur et applique le protocole d'extraction correspondant :

1. PROTOCOLE GENERALI :
   - Le document contient à la fois les acquisitions et les encours détaillés ligne par ligne.
   - Parcours toutes les pages du tableau nominatif pour extraire chaque ligne client.
   - Les codes "EC" ou "EUR" correspondent au support "EURO". Les codes "UC" ou "UCO" correspondent au support "UC".

2. PROTOCOLE ABEILLE ASSURANCES :
   - Le tableau détaillé des premières pages ne contient que les commissions d'ACQUISITION ("affectation de prime") et les REPRISES ("annul. encaiss."). Extrais ces lignes individuellement.
   - Les commissions d'ENCOURS ne sont pas détaillées par client. Va directement à l'avant-dernière page (section "DIVERS"). Extrais le montant global de la ligne "commission sur encours ABEILLE" et crée une ligne générique d'encours avec ce montant.

3. PROTOCOLE AXA FRANCE VIE :
   - Lis attentivement l'OBJET en page 1 du document :
     * Si l'objet est "com. d'acquisition", toutes les lignes du document sont de nature "ACQUISITION".
     * Si l'objet est "com. sur rétrocessions OPCVM", toutes les lignes du document sont de nature "ENCOURS".
   - Utilise le tableau récapitulatif par contrat (en fin de document) pour extraire les lignes nominatives.

4. PROTOCOLE CARDIF (BNP PARIBAS) :
   - Regarde le titre du document en page 1 et 2 :
     * Si "Cardif Assurance Vie" -> Enveloppe = "Assurance Vie"
     * Si "Cardif Retraite" -> Enveloppe = "PER / Retraite"
   - Extrais le numéro d'Apporteur d'affaires (ex: 104577, 117917, 75137) écrit en haut de page.
   - Repère les différentes sections du document :
     * "Commission assise sur production" -> Extrais chaque ligne client comme Nature = "ACQUISITION"
     * "Commission assise sur versements réguliers" -> Extrais chaque ligne client comme Nature = "ACQUISITION"
     * "Avoir assis sur versements réguliers" -> Extrais chaque ligne client en négatif comme Nature = "REPRISE"
     * "Commission assise sur encours" -> Les lignes sont globales (non nominatives). Crée pour chaque ligne de ce tableau un enregistrement générique (ex: Client = "Portefeuille Global Cardif") :
       - Si "Fonds en euros et assimilé" -> Support: "EURO" / detail_reporting_cible: "dont encours sur contrat [Vie ou PER] part €"
       - Si "OPCVM interne" ou "OPCVM externe" ou "OPCVM privilège" ou "NC Actions" ou "Profilé" -> Support: "UC" / detail_reporting_cible: "dont encours sur contrat [Vie ou PER] part UC"

5. PROTOCOLE MMA (COVÉA) :
   - Le document contient l'objet "Information relative à l'encours" ou le titre "JUSTIFICATIF DE CALCUL DE REMUNERATION - ENCOURS". 
   - Toutes les lignes extraites de ce document sont de nature "ENCOURS".
   - Ce document est découpé en plusieurs sous-portefeuilles (ex: "DEPEND DE 11 13700 G84002", "CEDRIC BLANCHET", "PAULINE CHASSAING", "BEZIERS"). Pour chaque page, identifie le sous-code apporteur ou le nom du conseiller en en-tête et enregistre-le dans le champ "code_apporteur".
   - Extrais chaque ligne du tableau nominatif (N° contrat, Nom, Produit, Libellé Support, Montant de rémunération).
   - Si "Libellé Support" = "ACTIF GENERAL" -> support_actif = "EURO".
   - Si "Libellé Support" contient "COVEA", "CARMIGNAC", "DNCA", "M&G", "SYCOMORE", "ECHIQUIER", "ACTIONS" -> support_actif = "OPCVM".

---

# ETAPE 2 : NETTOYAGE ET INTEGRATION DES DONNEES (REGLES METIER)

1. Nettoyage des numéros de contrats :
   - Supprime systématiquement le zéro initial s'il y en a un (ex: "0901234" devient "901234", "010567" devient "10567").

2. Qualification de l'Enveloppe Fiscale (Vie vs PER vs Prévoyance vs Retraite Coll) :
   - Détermine la classe du contrat selon son préfixe, son code produit ou son arborescence :
     * PER / RETRAITE INDIVIDUELLE : Contrat commençant par les préfixes 21, 22, 23, ou si le produit contient "PER", "PERin", "RETRAITE INDIVIDUELLE", "MADELIN", "PLURIELLE RETRAITE", "PER GENERALI", "Cardif Retraite", "MULTISTRATEGIES RETRAITE PRO".
     * RETRAITE COLLECTIVE : Contrat commençant par 9, 090 (ou si arborescence "RETRAITE COLLECTIVE").
     * ASSURANCE VIE / EPARGNE : Contrat commençant par 20, 38, 5 (ou contrats AXA commençant par 100/, 579/, 96034, 96544, ou si le produit contient "CORALIS", "EP PLURIELLE", "EPAR ACTIVE", "Cardif Assurance Vie", "Cardif Elite", "ADIF OPTIMUM", "MULTISTRATEGIES 2000", "MDM LIBERTE", "LONG-COURS AV1", "SIGNATURE PREMIUM", "SIGNATURE ACTIFS", "MDM INITIATIVES II", "ADIF KDO DE VIE").
     * PREVOYANCE / SANTE INDIVIDUELLE : Contrats commençant par 376 (Prévoyance) ou 377 (Santé) ou arborescence "PREVOYANCE SANTE INDIVIDUELLE".
     * PREVOYANCE / SANTE COLLECTIVE : Contrats commençant par 10, 11, 16, 26, 27.

3. Qualification de la typologie d'actifs (Sous-Type d'Actif) :
   - Analyse le nom du support financier (le fonds) pour le classifier :
     * PRODUIT STRUCTURE : Le nom contient "Autocall", "Escalier", "Opti", "Horizon", "EMTN", "FTSE", "Phoenix", "Target", "Zenith".
     * PRIVATE EQUITY : Le nom contient "FCPR", "FPCI", "Private Equity", "Capza", "Eurazeo", "Apax", "Altalife", "LBO", "Venture".
     * SCPI : Le nom contient "SCPI", "Diversipierre", "Sofidy", "Pierre", "Immo", "Sélection 1 P".
     * OPCVM : Par défaut, s'il s'agit d'un OPCVM classique (ex: Covea, Fidelity, Carmignac, DNCA, M&G, Sycomore, Echiquier, Magellan, Lazard, Comgest, Oddo, Keren, Safran, Eurose).

---

# ETAPE 3 : CLASSIFICATION VIA LA HIERARCHIE DE RECONCILIATION (REGLES STRICTES)
Pour qualifier le champ "detail_reporting_cible", applique en priorité absolue cette hiérarchie de correspondance lorsque tu analyses l'arborescence des catégories EBP / Assureur :

1. SI la hiérarchie du document correspond à :
   \`EPARGNE > COMMISSIONS SUR ARBITRAGES GENERALI VIE > COMM. SUR UP FRONT ARBITRAGE\`
   --> detail_reporting_cible = "dont upfront produits structurés"

2. SI la hiérarchie du document correspond à :
   \`EPARGNE > COMMISSIONS SUR COTISATIONS GENERALI VIE > COM. ACQU. SUR PRIME LIBRE\`
   --> detail_reporting_cible = "dont droits d'entrée assurance vie"

3. SI la hiérarchie du document correspond à :
   \`EPARGNE > COMMISSIONS SUR ARBITRAGES GENERALI VIE > COMMISSION ARBITRAGE\`
   --> detail_reporting_cible = "dont commission sur arbitrage assurance vie"

4. SI la hiérarchie du document correspond à :
   \`EPARGNE > COMMISSIONS SUR COTISATIONS GENERALI VIE > COM. VERSEMENT LIBRE PROGRAMME\`
   --> detail_reporting_cible = "dont commission sur versement périodique assurance vie"

5. SI la hiérarchie du document correspond à :
   \`PREVOYANCE SANTE INDIVIDUELLE > COMMISSIONS D APPORT SUR COTISATIONS GENERALI VIE > COM. ACQUISITION SUR PRIME PP\`
   --> detail_reporting_cible = "dont com. sur souscription prévoyance"

6. SI la hiérarchie du document correspond à :
   \`RETRAITE INDIVIDUELLE > COMMISSIONS SUR COTISATIONS GENERALI RETRAITE > COM. ACQUISITION SUR PRIME PP\`
   --> detail_reporting_cible = "dont commission sur versement périodique PER"

7. SI la hiérarchie du document correspond à :
   \`RETRAITE INDIVIDUELLE > COMMISSIONS SUR ENCOURS GENERALI RETRAITE > COMMISSION SUR ENCOURS\`
   --> detail_reporting_cible = "dont encours sur contrat PER part UC"

8. SI la hiérarchie du document correspond à :
   \`RETRAITE COLLECTIVE > COMMISSIONS SUR ENCOURS GENERALI RETRAITE > COMMISSION SUR ENCOURS\`
   --> detail_reporting_cible = "dont com. sur encours PEE / PERCO"

---

# AUTRES CLASSIFICATIONS DE REPORTING CIBLE
Si la ligne n'entre pas dans les 8 règles strictes ci-dessus, classe-la selon les règles logiques suivantes :

Pour les autres commissions d'ACQUISITION :
- "dont droits d'entrée PER" (Si droits d'entrée PER hors versements périodiques)
- "dont commission sur arbitrage PER"
- "dont upfront sur Private Equity en UC"
- "dont upfront sur SCPI en UC"
- "dont autres commissions" (Par défaut)

Pour les autres commissions d'ENCOURS :
- "dont encours sur contrat assurance vie part UC" (Frais de gestion UC sur enveloppe Vie)
- "dont encours sur contrat assurance vie part €" (Frais de gestion Euro sur enveloppe Vie)
- "dont encours sur OPCVM UC assurance vie" (Rétrocessions OPCVM sur enveloppe Vie)
- "dont encours sur Private Equity UC assurance vie" (Rétrocessions Private Equity sur enveloppe Vie)
- "dont encours sur SCPI UC assurance vie" (Rétrocessions SCPI sur enveloppe Vie)
- "dont encours sur Autre UC assurance vie"
- "dont encours sur contrat PER part €" (Frais de gestion Euro sur enveloppe PER)
- "dont encours sur OPCVM UC PER" (Rétrocessions OPCVM sur enveloppe PER)
- "dont encours sur Private Equity UC PER" (Rétrocessions Private Equity sur enveloppe PER)
- "dont encours sur SCPI UC PER" (Rétrocessions SCPI sur enveloppe PER)
- "dont encours sur Autre UC PER"

---

# SCHEMA DE SORTIE JSON ATTENDU
Renvoie STRICTEMENT un objet JSON respectant cette structure exacte, sans aucun texte d'accompagnement avant ou après :

{
  "metadata": {
    "assureur": "GENERALI | ABEILLE | AXA | CARDIF | MMA",
    "cabinet_beneficiaire": "string (ex: VALETYS, ID PATRIMOINE, ID PRO SPORT, LINARD CHARBONNEL)",
    "reference_bordereau": "string",
    "code_apporteur": "string (ex: 11 13700 G84002, BEZIERS, 117917...)",
    "date_debut_periode": "DD/MM/YYYY",
    "date_fin_periode": "DD/MM/YYYY",
    "montant_total_paye": 0.00
  },
  "commissions_extraites": [
    {
      "client_nom_prenom": "string",
      "numero_contrat": "string (nettoyé du zero initial)",
      "produit_nom": "string (ex: Cardif Elite, SENSEO, ADIF OPTIMUM)",
      "support_actif": "EURO | OPCVM | PRIVATE_EQUITY | SCPI | STRUCTURE",
      "nature_commission": "ACQUISITION | ENCOURS | REPRISE",
      "detail_reporting_cible": "string (doit correspondre EXACTEMENT à l'une des catégories cibles)",
      "montant_net": 0.00
    }
  ]
}

---

# CONTROLE DE COHERENCE ET VALIDATION (CHECKSUM)
Avant de finaliser ta réponse, effectue la validation mathématique suivante :
La somme de tous les "montant_net" de la liste "commissions_extraites" doit être rigoureusement égale au "montant_total_paye" indiqué dans les "metadata" (à +/- 0.02 € près pour tolérance d'arrondi). 
Si la somme ne correspond pas, ré-analyse le document pour identifier la ligne ou le montant global que tu as manqué (regarde particulièrement la page "DIVERS" pour Abeille, les tableaux d'Avoirs pour Cardif, ou les différents sous-portefeuilles pour MMA).`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: extractionSchema,
        temperature: 0.1, // Low temperature for more deterministic extraction
      },
    });

    if (!response.text) {
      throw new Error("No text returned from the model.");
    }

    const parsedData = JSON.parse(response.text) as CommissionStatement;
    return parsedData;
  } catch (error) {
    console.error("Error extracting data with Gemini:", error);
    throw new Error("Failed to process the document. Please ensure it is a valid commission statement and try again.");
  }
};

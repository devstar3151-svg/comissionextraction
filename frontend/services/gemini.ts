import { GoogleGenAI, Type } from '@google/genai';
import { CommissionStatement } from '../types';

// Initialize the Gemini client
// Note: In a real app, ensure process.env.API_KEY is available in your build/runtime environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    assureur: { 
      type: Type.STRING, 
      description: "The insurer or insurance company issuing or related to the commission statement." 
    },
    fournisseur: { 
      type: Type.STRING, 
      description: "The distributor, partner, platform, firm, provider, or CGP entity associated with the commission statement." 
    },
    periode: { 
      type: Type.STRING, 
      description: "The commission period covered by the PDF in format dd/MM/yyyy - dd/MM/yyyy." 
    },
    montant_total_declare: {
      type: Type.NUMBER,
      description: "The overall total commission amount explicitly stated in the document (the aggregate)."
    },
    transactions: {
      type: Type.ARRAY,
      description: "List of individual policy commissions, line items, or transactions.",
      items: {
        type: Type.OBJECT,
        properties: {
          numero_contrat: { type: Type.STRING, description: "The contract number, policy number, agreement number, or convention-contract identifier." },
          produit: { type: Type.STRING, description: "The product or contract product name." },
          support: { type: Type.STRING, description: "The investment support, fund, EURO pocket, UC pocket, unit-linked support, etc." },
          commission: { type: Type.NUMBER, description: "The commission or remuneration amount." },
          type_commission: { type: Type.STRING, description: "The type or label of commission." }
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
              text: `You are a specialized AI extraction agent for commission reporting PDF documents sent by insurers to financial advisors.

Business context:
A CGP, meaning Conseiller en Gestion de Patrimoine or financial advisor, distributes insurance-based contracts such as life insurance, retirement savings contracts, and protection insurance contracts. These contracts are considered products.

For distributing these contracts, insurers pay remuneration to the CGP.

The CGP may be remunerated in two main ways:

1. Individual / subscription-related remuneration:
 This remuneration is usually linked to a specific client contract.
 It may be paid at the time of subscription or investment.
 It can be called entry fees, acquisition commission, subscription commission, commission d'acquisition, droits d'entrée, or similar wording.

2. Recurring remuneration on assets under management:
 This remuneration is linked to the outstanding assets, also called encours.
 It may be calculated at contract level, product level, support level, EURO fund level, UC level, or aggregated level.
 It may not always include contract-level details.
 It can be called commission sur encours, frais de gestion, rétrocession, remuneration on assets, trail commission, or similar wording.

The remuneration on encours may be calculated at several levels:
- The EURO pocket of the contract, also called fonds euros, actif général, poche EURO, or frais de gestion euro.
- The UC pocket, also called unités de compte, UC, poche UC, frais de gestion UC, or commission sur encours.
- The individual supports themselves, such as funds, ISINs, unit-linked supports, or other investment supports.

The insurer sends PDF documents to the CGP describing these remunerations in order to provide commission reporting.

Your task:
Analyze the PDF and extract the available information into the standardized JSON data model below.

Target data model:

{
 "assureur": null,
 "fournisseur": null,
 "periode": null,
 "montant_total_declare": null,
 "transactions": [
 {
 "numero_contrat": null,
 "produit": null,
 "support": null,
 "commission": null,
 "type_commission": null
 }
 ]
}

General extraction principles:
1. Extract only information explicitly present in the PDF.
2. Never guess, infer, calculate, or invent missing values.
3. If a field is not present, return null.
4. If a value is ambiguous or unreadable, return null.
5. Always return valid JSON only.
6. Do not include explanations outside the JSON unless explicitly requested.
7. Each meaningful commission or remuneration line should become one transaction object.
8. Do not merge unrelated lines.
9. If the PDF contains several tables, extract all relevant commission or remuneration lines.
10. Ignore headers, footers, page numbers, marketing text, legal notices, and non-remuneration content.
11. Preserve contract numbers, product names, support names, and ISIN codes exactly as they appear when possible.
12. Normalize numeric amounts only when it is safe to do so.
13. Preserve the sign of amounts if shown in the document.
14. If a commission amount is negative, preserve the negative sign in the commission field.
15. Do not create additional fields outside the target data model.
16. Table Sub-headers: If a table contains a sub-header row spanning multiple columns (e.g., "8301 - HIMALIA"), use this text as the \`produit\` for all subsequent detailed rows until a new sub-header appears.
17. Section Headers: Use headers above tables (e.g., "EPARGNE", "COMMISSIONS SUR ARBITRAGES GENERALI VIE") to infer \`produit\` or \`type_commission\` if the row itself lacks this detail.
18. Sub-totals and Totals: Do NOT extract "Sous Total" or "Total" rows as individual transactions if the detailed rows above them are already extracted. Only extract the detailed rows.
19. CRITICAL: Extract ALL detailed rows. Do not truncate the list of transactions. Do not omit any rows, even if the document is long. You must output every single detail row found.

Field definitions:

1. assureur:
The insurer or insurance company issuing or related to the commission statement.
Examples may include:
- Generali
- MMA
- Abeille
- Suravenir
- BNP Paribas Cardif

2. fournisseur:
The distributor, partner, platform, firm, provider, or CGP entity associated with the commission statement.
Examples may include:
- ID Patrimoine
- ID Pro Sport
- Familiance
- Linard
- Valetys

3. periode:
The commission period covered by the PDF.

The period must be returned as a date range using the following format:

dd/MM/yyyy - dd/MM/yyyy

The period must represent one of the following:
- one month
- one quarter
- one year

Date normalization rules for periode:
1. If the document gives a month, return the first day and the last day of that month.
 Example:
 "Janvier 2024" must become "01/01/2024 - 31/01/2024".

2. If the document gives a quarter, return the first day of the first month and the last day of the last month of the quarter.
 Example:
 "T1 2024" or "1er trimestre 2024" must become "01/01/2024 - 31/03/2024".
 "T2 2024" must become "01/04/2024 - 30/06/2024".
 "T3 2024" must become "01/07/2024 - 31/09/2024".
 "T4 2024" must become "01/10/2024 - 31/12/2024".

3. If the document gives a year, return the first day and the last day of the year.
 Example:
 "2024" must become "01/01/2024 - 31/12/2024".

4. If the document gives a specific period range, normalize it into dd/MM/yyyy - dd/MM/yyyy when possible.

5. If the period cannot be safely identified as a month, quarter, or year, return null.

6. Do not infer a period from unrelated dates unless the document clearly indicates that the date is the commission period, covered period, due date, settlement period, or reporting period.

4. montant_total_declare:
The overall total commission amount explicitly stated in the document (the aggregate).
If the document provides a grand total, summary total, or "Total des commissions", extract it here.
Do not calculate this yourself; only extract it if it is written in the document.

5. numero_contrat:
The contract number, policy number, agreement number, or convention-contract identifier.
This field is often present for individual or contract-level commissions.
For encours or aggregated commissions, this field may be absent.
If the commission is aggregated and no contract number is provided, return null.

6. produit:
The product or contract product name.
This may refer to savings, retirement, life insurance, collective retirement, individual retirement, protection, PER, capitalization, or another product label in the document.
It can also be found in table sub-headers (e.g., "8301 - HIMALIA").

7. support:
The investment support, fund, EURO pocket, UC pocket, unit-linked support, fonds euros, actif général, ISIN, or support label.
If the remuneration is aggregated at EURO or UC pocket level, use the corresponding label as the support.
If the remuneration is at contract level and no support is specified, return null.
If the support has an ISIN code, include the ISIN in the support field with the support name if available.

8. commission:
The commission or remuneration amount to be extracted, subject to the specific commission rules below.

9. type_commission:
The type or label of commission.
This field should describe the nature of the remuneration when available.

Examples of type_commission:
- Commission d'acquisition
- Droits d'entrée
- Commission sur encours
- Frais de gestion euro
- Frais de gestion UC
- Rétrocession
- Commission TTC
- Libellé commission
- Commission assise sur encours
- Encours
- Individuel
- Epargne
- Retraite
- Vie
- Retraite collective
- Retraite individuelle
- Commission arbitrage

If the PDF clearly indicates whether the commission is related to individual subscription/acquisition or encours, use that information in type_commission.

Important classification rules for type_commission:

1. If the commission is linked to a specific contract, subscription, payment, investment, acquisition, or entry fee, classify it as an individual/acquisition-type commission.
 Use the original document wording where possible.
 Examples:
 - "Commission d'acquisition"
 - "Droits d'entrée"
 - "Individuel"
 - "Epargne"

2. If the commission is based on assets under management, outstanding assets, fonds euros, UC, support-level assets, or aggregated encours, classify it as an encours-type commission.
 Use the original document wording where possible.
 Examples:
 - "Commission sur encours"
 - "Frais de gestion euro"
 - "Frais de gestion UC"
 - "Commission assise sur encours"
 - "Encours"

3. If the document gives a precise commission label, extract that label into type_commission.
 Example:
 If a column is named "Libellé commission", use its value for type_commission.

4. If the commission type is not available or cannot be determined, return null.

Synonym and mapping dictionary:

Use the following labels and variations to identify the target fields.

assureur:
- Generali
- MMA
- ABEILLE
- Abeille
- SURAVENIR
- Suravenir
- BNP Paribas Cardif
- Cardif

fournisseur:
- ID Patrimoine
- ID Pro Sport
- Familiance
- Linard
- Valetys

periode:
- Periode
- Période
- Périodes couvertures commissions
- Périodes couvertes commissions
- Commissions dues au
- Commission due au
- Commissionassise sur encours
- Commission assise sur encours
- Période de commission
- Période concernée
- Période de rémunération
- Date de règlement
- Date de paiement
- Mois
- Trimestre
- Année
- Exercice

numero_contrat:
- Contrat
- N° contrat
- No contrat
- Numéro de contrat
- N° de contrat
- N° du contrat
- Numero contrat
- Police
- N° police
- Numéro de police
- Convention
- N° convention
- N° convention - Contrat
- N° convention – Contrat

produit:
- Produit
- Libellé produit
- Nom du produit
- N° du produit
- Type produit
- Contrat produit
- Libellé commission
- EPARGNE
- Epargne
- Épargne
- EPARGNE RETRAITE
- Epargne retraite
- Épargne retraite
- VIE
- Vie
- Assurance vie
- RETRAITE COLLECTIVE
- Retraite collective
- RETRAITE INDIVIDUELLE
- Retraite individuelle
- PER
- Capitalisation
- Prévoyance
- Table sub-headers (e.g., "8301 - HIMALIA")

support:
- Support
- Soutien
- Support de commission
- Support Garantie
- Support garantie
- Libellé support
- N° du support
- Nom du support
- ISIN
- Code ISIN
- Fonds
- Fonds euro
- Fonds euros
- Fonds en euros
- Actif général
- Euro
- Poche euro
- Poche EURO
- UC
- Unité de compte
- Unités de compte
- Poche UC
- Support UC
- Gestion euro
- Gestion UC

commission:
- Commission
- Montant de Commission
- Montant de commission
- Montant de Rémunération
- Montant de rémunération
- Rémunération
- Remuneration
- Commission TTC
- Montant TTC
- Commission acquise
- Commission d'acquisition
- Droits d'entrée
- Commission sur encours
- Rétrocession
- Retrocession
- Rétrocessions
- Frais de gestion
- Frais de gestion euro
- Frais de gestion UC
- Frais de gestion du contrat
- Commission assise sur encours

type_commission:
- Libellé commission
- Type de commission
- Nature commission
- Nature de commission
- Nature de rémunération
- Commission d'acquisition
- Droits d'entrée
- Commission sur encours
- Commission assise sur encours
- Frais de gestion
- Frais de gestion euro
- Frais de gestion UC
- Rétrocession
- Encours
- Individuel
- Epargne
- Épargne
- Vie
- Retraite collective
- Retraite individuelle
- COMMISSION ARBITRAGE
- COMMISSIONS SUR ARBITRAGES

Specific rules for the commission field:

1. Extract commission amounts only when they correspond to commission, remuneration, acquisition commission, entry fee, trail commission, commission on assets, commission sur encours, retrocession, or Commission TTC.
2. If both "Commission HT" and "Commission TTC" are present, always use "Commission TTC".
3. Never use an amount labelled "Commission HT" for the field "commission".
4. If only "Commission HT" is available and no TTC or equivalent commission amount exists, return "commission": null.
5. Do not convert Commission HT into Commission TTC.
6. Do not calculate VAT or tax.
7. Do not derive TTC from HT.
8. If the label is simply "Commission", "Rémunération", or "Montant de rémunération" and there is no conflicting HT/TTC distinction, extract the amount as commission.
9. If you find raw details (contract level) and aggregate details (like "Sous Total" or "Total"), extract ONLY the raw details as transactions. Do NOT create transactions for the sub-total or total rows. Extract the grand total explicitly stated in the document (e.g., "Total COMMISSIONS SUR ARBITRAGES") into the \`montant_total_declare\` field.
10. If ONLY aggregated totals are available (no contract details), create one transaction for each aggregated line if it represents a meaningful remuneration entry, and also extract the grand total into montant_total_declare.

Rules for individual commissions versus encours commissions:

1. Individual commissions:
 These are usually linked to a specific contract, subscription, client investment, product, or insurance policy.
 They often have a numero_contrat.
 They may be called:
 - Commission d'acquisition
 - Droits d'entrée
 - Commission de souscription
 - Commission individuelle
 - Epargne
 - Vie
 - Retraite individuelle
 - Commission arbitrage

 For these lines:
 - Extract numero_contrat if present.
 - Extract produit if present.
 - Extract support if present.
 - Extract commission.
 - Set type_commission using the most precise label available.

2. Encours commissions:
 These are based on outstanding assets or assets under management.
 They may be aggregated and may not have details by contract.
 They may be calculated on EURO funds, UC pockets, or supports.
 They may be called:
 - Commission sur encours
 - Commission assise sur encours
 - Frais de gestion
 - Frais de gestion euro
 - Frais de gestion UC
 - Rétrocession
 - Encours

 For these lines:
 - If no contract number is provided, set numero_contrat to null.
 - Extract produit if present.
 - Extract support if present.
 - Extract commission.
 - Set type_commission to the relevant encours-related label.

3. If the PDF gives a commission aggregated by support, create one transaction per support.
4. If the PDF gives a commission aggregated by product, create one transaction per product.
5. If the PDF gives a commission aggregated globally and no product, support, or contract is available, create one transaction with available fields and null for missing fields.
6. Never invent contract-level details for encours lines if they are not present.

Rules for contract-level versus support-level information:

1. If the PDF provides information at contract level only, extract numero_contrat, produit, commission, and type_commission if available. Set support to null.
2. If the PDF provides information at support level, extract one transaction per support line.
3. If the PDF aggregates remuneration at EURO pocket level, put the EURO-related label in support, for example "Fonds euros", "Poche EURO", or "Actif général".
4. If the PDF aggregates remuneration at UC pocket level, put the UC-related label in support, for example "UC", "Unités de compte", or "Poche UC".
5. If a support has an ISIN code, include the ISIN in the support field, with the support name if available.
6. If the same contract appears across several supports, create separate transactions for each support.
7. If the same contract has different remuneration types, create separate transactions when the document presents them as separate rows.

Amount handling rules:

1. Accept French and European number formats.
2. Examples:
 - "1 234,56" should be interpreted as 1234.56 if normalization is required.
 - "1.234,56" should be interpreted as 1234.56 if normalization is required.
 - "-123,45" should preserve the negative sign.
3. Do not remove negative signs.
4. Do not add a currency unless it is explicitly shown.
5. If the amount includes EUR or €, retain or normalize consistently.
6. If the requested output expects numbers, return numeric values without currency symbols.
7. If the document format is unclear, preserve the amount as text.

Output requirements:

Return only valid JSON in the following structure:

{
 "assureur": "string or null",
 "fournisseur": "string or null",
 "periode": "dd/MM/yyyy - dd/MM/yyyy or null",
 "montant_total_declare": "number or null",
 "transactions": [
 {
 "numero_contrat": "string or null",
 "produit": "string or null",
 "support": "string or null",
 "commission": "number, string, or null",
 "type_commission": "string or null"
 }
 ]
}

Quality checks before final answer:

1. Verify that the JSON is valid.
2. Verify that all required keys are present.
3. Verify that transactions is always an array.
4. Verify that each transaction contains exactly:
 - numero_contrat
 - produit
 - support
 - commission
 - type_commission
5. Verify that no Commission HT amount has been used as commission.
6. Verify that missing fields are null.
7. Verify that no values were guessed.
8. Verify that each transaction corresponds to a row, section, or identifiable remuneration item in the PDF.
9. Verify that periode is formatted as dd/MM/yyyy - dd/MM/yyyy.
10. Verify that periode represents a month, quarter, or year.
11. Verify that individual/acquisition commissions and encours commissions are distinguished through type_commission whenever possible.`,
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

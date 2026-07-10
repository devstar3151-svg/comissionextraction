import React, { useState } from 'react';
import { CommissionStatement } from '../types';
import { FileSpreadsheet, AlertTriangle, Download, Code, Table, Building2, ListOrdered, Sigma, CheckCircle2, XCircle } from 'lucide-react';

interface ResultsDashboardProps {
  data: CommissionStatement;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const meta = data.metadata || {};
  const txs = data.commissions_extraites || [];

  const rowCount = txs.length;
  
  const hasTotalDeclare = meta.montant_total_paye !== null && meta.montant_total_paye !== undefined;
  const totalDeclare = hasTotalDeclare ? meta.montant_total_paye! : 0;
  const totalCalcule = txs.reduce((sum, tx) => sum + (tx.montant_net || 0), 0);
  
  const ecart = hasTotalDeclare ? totalDeclare - totalCalcule : 0;
  const isEcartZero = Math.abs(ecart) < 0.05; // Safe floating point comparison with tolerance

  // Target lists based on the provided template
  const acqTargets = [
    "dont upfront produits structurés",
    "dont droits d'entrée assurance vie",
    "dont commission sur arbitrage assurance vie",
    "dont commission sur versement périodique assurance vie",
    "dont surcommission assurance vie",
    "dont droits d'entrée PER",
    "dont commission sur arbitrage PER",
    "dont commission sur versement périodique PER",
    "dont surcommission PER",
    "dont upfront sur Private Equity en UC",
    "dont upfront sur SCPI en UC",
    "dont com. sur souscription prévoyance",
    "dont autres commissions"
  ];

  const encTargets = [
    "dont encours sur contrat assurance vie part UC",
    "dont encours sur contrat assurance vie part €",
    "dont encours sur OPCVM UC assurance vie",
    "dont encours sur Private Equity UC assurance vie",
    "dont encours sur SCPI UC assurance vie",
    "dont encours sur Autre UC assurance vie",
    "dont encours sur contrat PER part UC",
    "dont encours sur contrat PER part €",
    "dont encours sur OPCVM UC PER",
    "dont encours sur Private Equity UC PER",
    "dont encours sur SCPI UC PER",
    "dont encours sur Autre UC PER",
    "dont com. sur encours PEE / PERCO"
  ];

  const getSumByTarget = (target: string) => {
    return txs
      .filter(tx => tx.detail_reporting_cible === target)
      .reduce((sum, tx) => sum + (tx.montant_net || 0), 0);
  };

  // Calculate totals for the two main buckets
  const totalAcq = acqTargets.reduce((sum, target) => sum + getSumByTarget(target), 0);
  const totalEnc = encTargets.reduce((sum, target) => sum + getSumByTarget(target), 0);

  const handleExportCSV = () => {
    if (!txs || txs.length === 0) return;
    
    const headers = ['Client', 'N° Contrat', 'Produit', 'Support/Actif', 'Nature', 'Cible Reporting', 'Montant Net'];
    const csvContent = [
      headers.join(','),
      ...txs.map(tx => [
        `"${tx.client_nom_prenom || ''}"`,
        `"${tx.numero_contrat || ''}"`,
        `"${tx.produit_nom || ''}"`,
        `"${tx.support_actif || ''}"`,
        `"${tx.nature_commission || ''}"`,
        `"${tx.detail_reporting_cible || ''}"`,
        tx.montant_net !== null ? tx.montant_net : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commissions_${meta.assureur || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Summary Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assureur */}
        <div className="bg-white p-6 rounded-2xl border border-[#e6dfd3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-[#f5f4f0] text-[#a87b4f] rounded-xl">
              <Building2 size={20} />
            </div>
            <span className="text-xs font-bold text-[#8c8985] uppercase tracking-wider">Assureur</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-[#2d2a26] font-serif truncate" title={meta.assureur || 'Inconnu'}>
              {meta.assureur || 'Inconnu'}
            </h4>
            <p className="text-sm text-[#5c5a58] mt-1 truncate">Cab: {meta.cabinet_beneficiaire || '-'}</p>
          </div>
        </div>

        {/* Card 2: Lignes Extraites */}
        <div className="bg-white p-6 rounded-2xl border border-[#e6dfd3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-[#f5f4f0] text-[#a87b4f] rounded-xl">
              <ListOrdered size={20} />
            </div>
            <span className="text-xs font-bold text-[#8c8985] uppercase tracking-wider">Volume</span>
          </div>
          <div>
            <h4 className="text-3xl font-bold text-[#2d2a26]">{rowCount}</h4>
            <p className="text-sm text-[#5c5a58] mt-1">Lignes extraites</p>
          </div>
        </div>

        {/* Card 3: Total Commission */}
        <div className="bg-white p-6 rounded-2xl border border-[#e6dfd3] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-[#f5f4f0] text-[#a87b4f] rounded-xl">
              <Sigma size={20} />
            </div>
            <span className="text-xs font-bold text-[#8c8985] uppercase tracking-wider">Montant</span>
          </div>
          <div>
            <h4 className="text-3xl font-bold text-[#2d2a26]">{formatCurrency(totalCalcule)}</h4>
            <p className="text-sm text-[#5c5a58] mt-1">Total calculé</p>
          </div>
        </div>

        {/* Card 4: Statut Réconciliation */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
          isEcartZero ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${
              isEcartZero ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {isEcartZero ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isEcartZero ? 'text-emerald-700' : 'text-red-700'
            }`}>Statut</span>
          </div>
          <div>
            <h4 className={`text-xl font-bold ${isEcartZero ? 'text-emerald-800' : 'text-red-800'}`}>
              {isEcartZero ? 'Réconcilié' : 'Écart détecté'}
            </h4>
            <p className={`text-sm mt-1 font-medium ${isEcartZero ? 'text-emerald-600' : 'text-red-600'}`}>
              Écart : {formatCurrency(ecart)}
            </p>
          </div>
        </div>
      </div>

      {/* Formal KPI Report Template (Matching the Image) */}
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-[#e6dfd3] shadow-sm font-sans text-sm text-black">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-[#2d2a26]">Rapport de Synthèse Officiel</h2>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-2 border-[#a87b4f] text-[#a87b4f] rotate-[-15deg] opacity-80">
            <span className="text-[8px] font-bold tracking-widest uppercase">Validé</span>
          </div>
        </div>

        {/* Assureur */}
        <div className="border border-black p-2.5 flex justify-between items-center bg-[#fdfbf9]">
          <span className="font-bold uppercase tracking-wide">ASSUREUR :</span>
          <span className="font-bold text-blue-800 uppercase">{meta.assureur || '-'}</span>
        </div>

        {/* Cabinet & Ref */}
        <div className="mt-5">
          <div className="mb-1.5 ml-1 text-[#5c5a58] font-medium">Cabinet {meta.cabinet_beneficiaire || ''}</div>
          <div className="border border-black p-2.5 flex justify-between items-center bg-[#fdfbf9]">
            <span className="font-bold uppercase tracking-wide">REFERENCE DE BORDEREAU :</span>
            <span className="font-bold text-blue-800 uppercase">{meta.reference_bordereau || '-'}</span>
          </div>
        </div>

        {/* Periode */}
        <div className="mt-5 border border-black p-3 flex flex-col sm:flex-row bg-[#fdfbf9]">
          <div className="font-bold w-full sm:w-1/3 mb-3 sm:mb-0 tracking-wide">Période de commissionnement :</div>
          <div className="w-full sm:w-2/3 flex flex-col items-center space-y-1.5">
            <div className="flex w-full max-w-[280px] justify-between">
              <span className="text-[#2d2a26]">Date de début :</span>
              <span className="font-bold text-blue-800">{meta.date_debut_periode || '-'}</span>
            </div>
            <div className="flex w-full max-w-[280px] justify-between">
              <span className="text-[#2d2a26]">Date de fin :</span>
              <span className="font-bold text-blue-800">{meta.date_fin_periode || '-'}</span>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-5 border border-black p-3 bg-[#fdfbf9]">
          <div className="flex w-full mb-3">
            <div className="w-1/2 font-bold tracking-wide">Commission totale payée :</div>
            <div className="w-1/2 flex justify-end font-bold text-blue-800 pr-4 sm:pr-16 text-base">{formatCurrency(totalDeclare)}</div>
          </div>
          <div className="flex w-full mt-1.5">
            <div className="w-1/2 text-right pr-6 text-[#2d2a26]">dont commissions d'acquisition :</div>
            <div className="w-1/2 flex justify-end font-bold text-blue-800 pr-4 sm:pr-16">{formatCurrency(totalAcq)}</div>
          </div>
          <div className="flex w-full mt-1.5">
            <div className="w-1/2 text-right pr-6 text-[#2d2a26]">dont commissions sur encours :</div>
            <div className="w-1/2 flex justify-end font-bold text-blue-800 pr-4 sm:pr-16">{formatCurrency(totalEnc)}</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Acquisition Box */}
          <div className="border border-black flex flex-col bg-white">
            <div className="flex justify-between items-center p-3 bg-yellow-300 border-b border-black">
              <span className="font-bold tracking-wide">Commission d'acquisition payée :</span>
              <span className="font-bold text-blue-800 text-base">{formatCurrency(totalAcq)}</span>
            </div>
            <div className="p-3 space-y-2">
              {acqTargets.map(target => {
                const val = getSumByTarget(target);
                return (
                  <div key={target} className="flex w-full items-center hover:bg-slate-50 transition-colors rounded px-1">
                    <div className="w-3/4 text-right pr-3 text-[#2d2a26] text-[13px]">{target} :</div>
                    <div className="w-1/4 text-right font-bold text-blue-800">{formatCurrency(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Encours Box */}
          <div className="border border-black flex flex-col bg-white">
            <div className="flex justify-between items-center p-3 bg-yellow-300 border-b border-black">
              <span className="font-bold tracking-wide">Commission sur encours payée :</span>
              <span className="font-bold text-blue-800 text-base">{formatCurrency(totalEnc)}</span>
            </div>
            <div className="p-3 space-y-2">
              {encTargets.map(target => {
                const val = getSumByTarget(target);
                return (
                  <div key={target} className="flex w-full items-center hover:bg-slate-50 transition-colors rounded px-1">
                    <div className="w-3/4 text-right pr-3 text-[#2d2a26] text-[13px]">{target} :</div>
                    <div className="w-1/4 text-right font-bold text-blue-800">{formatCurrency(val)}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Transactions Section (Raw Details) */}
      <div className="bg-white rounded-2xl border border-[#e6dfd3] shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-[#e6dfd3] flex flex-col sm:flex-row sm:items-center justify-between bg-[#fdfbf9] gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#f5f4f0] rounded-lg text-[#a87b4f]">
              <FileSpreadsheet size={20} />
            </div>
            <h3 className="text-xl font-bold text-[#2d2a26] font-serif">Lignes de Commissions</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-[#f5f4f0] p-1 rounded-lg border border-[#e6dfd3]">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-[#2d2a26] shadow-sm' : 'text-[#8c8985] hover:text-[#2d2a26]'}`}
              >
                <Table size={16} />
                <span>Tableau</span>
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'json' ? 'bg-white text-[#2d2a26] shadow-sm' : 'text-[#8c8985] hover:text-[#2d2a26]'}`}
              >
                <Code size={16} />
                <span>JSON</span>
              </button>
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-[#a87b4f] hover:bg-[#8e663f] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter CSV</span>
            </button>
          </div>
        </div>
        
        {viewMode === 'table' ? (
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="border-b border-[#e6dfd3] text-xs uppercase tracking-wider text-[#8c8985] bg-[#fdfbf9]">
                  <th className="px-6 py-4 font-bold whitespace-nowrap">Client</th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">N° Contrat</th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">Produit</th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">Support / Actif</th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">Nature</th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">Cible Reporting</th>
                  <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Montant Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f4f0]">
                {txs && txs.length > 0 ? (
                  txs.map((tx, index) => (
                    <tr key={index} className="hover:bg-[#fdfbf9] transition-colors">
                      <td className="px-6 py-4 text-sm text-[#2d2a26] font-medium whitespace-nowrap">
                        {tx.client_nom_prenom || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5c5a58] whitespace-nowrap">
                        {tx.numero_contrat || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5c5a58] whitespace-nowrap">
                        {tx.produit_nom || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5c5a58] whitespace-nowrap">
                        {tx.support_actif || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5c5a58] whitespace-nowrap">
                        {tx.nature_commission ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${
                            tx.nature_commission.toUpperCase() === 'ACQUISITION' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                            tx.nature_commission.toUpperCase() === 'ENCOURS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                            tx.nature_commission.toUpperCase() === 'REPRISE' ? 'bg-red-50 text-red-700 border border-red-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {tx.nature_commission}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#5c5a58] whitespace-nowrap">
                        {tx.detail_reporting_cible ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#f5f4f0] text-[#2d2a26] text-xs font-medium border border-[#d1ccc5]">
                            {tx.detail_reporting_cible}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#a87b4f] text-right whitespace-nowrap">
                        {formatCurrency(tx.montant_net)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-[#8c8985]">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <FileSpreadsheet size={32} className="opacity-50" />
                        <p>Aucune ligne de commission n'a pu être extraite de ce document.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-[#2d2a26] text-[#e6dfd3] overflow-auto max-h-[600px] custom-scrollbar">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CommissionStatement } from '../types';
import { Building2, Calendar, User, FileSpreadsheet, Sigma, FileCheck, AlertTriangle, CheckCircle, Download, Code, Table, ListOrdered } from 'lucide-react';

interface ResultsDashboardProps {
  data: CommissionStatement;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const hasTotalDeclare = data.montant_total_declare !== null && data.montant_total_declare !== undefined;
  const totalDeclare = hasTotalDeclare ? data.montant_total_declare! : 0;
  const totalCalcule = data.transactions?.reduce((sum, tx) => sum + (tx.commission || 0), 0) || 0;
  const rowCount = data.transactions?.length || 0;
  
  const ecart = hasTotalDeclare ? totalDeclare - totalCalcule : 0;
  const isEcartZero = Math.abs(ecart) < 0.01; // Safe floating point comparison

  const handleExportCSV = () => {
    if (!data.transactions || data.transactions.length === 0) return;
    
    const headers = ['N° Contrat', 'Produit', 'Support', 'Type de Commission', 'Commission'];
    const csvContent = [
      headers.join(','),
      ...data.transactions.map(tx => [
        `"${tx.numero_contrat || ''}"`,
        `"${tx.produit || ''}"`,
        `"${tx.support || ''}"`,
        `"${tx.type_commission || ''}"`,
        tx.commission !== null ? tx.commission : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `commissions_${data.assureur || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Assureur</p>
            <p className="text-lg font-semibold text-slate-900 truncate" title={data.assureur || 'Inconnu'}>
              {data.assureur || 'Inconnu'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <User size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Fournisseur</p>
            <p className="text-lg font-semibold text-slate-900 truncate" title={data.fournisseur || 'Inconnu'}>
              {data.fournisseur || 'Inconnu'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Période</p>
            <p className="text-lg font-semibold text-slate-900">
              {data.periode || 'Inconnue'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <ListOrdered size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Lignes extraites</p>
            <p className="text-lg font-semibold text-slate-900">
              {rowCount}
            </p>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <FileCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Déclaré (Document)</p>
            <p className="text-2xl font-bold text-slate-900">
              {hasTotalDeclare ? formatCurrency(totalDeclare) : 'Non déclaré'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Sigma size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Calculé (Détails)</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalCalcule)}
            </p>
          </div>
        </div>

        <div className={`bg-white p-5 rounded-xl border shadow-sm flex items-start space-x-4 ${hasTotalDeclare && !isEcartZero ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
          <div className={`p-3 rounded-lg ${hasTotalDeclare && !isEcartZero ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {hasTotalDeclare && !isEcartZero ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
          </div>
          <div>
            <p className={`text-sm font-medium ${hasTotalDeclare && !isEcartZero ? 'text-red-600' : 'text-slate-500'}`}>
              Écart (Déclaré - Calculé)
            </p>
            <p className={`text-2xl font-bold ${hasTotalDeclare && !isEcartZero ? 'text-red-700' : 'text-slate-900'}`}>
              {hasTotalDeclare ? formatCurrency(ecart) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 gap-4">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet size={20} className="text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-800">Transactions Extraites (Détails)</h3>
            <span className="text-sm font-medium text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full">
              {rowCount} lignes
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Table size={16} />
                <span>Tableau</span>
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'json' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Code size={16} />
                <span>JSON Brut</span>
              </button>
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium whitespace-nowrap">N° Contrat</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Produit</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Support</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Type de Commission</th>
                  <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions && data.transactions.length > 0 ? (
                  data.transactions.map((tx, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">
                        {tx.numero_contrat || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {tx.produit || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {tx.support || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {tx.type_commission ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {tx.type_commission}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-emerald-600 text-right whitespace-nowrap">
                        {formatCurrency(tx.commission)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Aucune transaction n'a pu être extraite de ce document.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-slate-900 text-emerald-400 overflow-auto max-h-[600px] custom-scrollbar">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

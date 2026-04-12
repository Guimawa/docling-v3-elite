import React from 'react'
import { User, Mail, LogOut } from 'lucide-react'
import Card from '@/components/Card'
import Input from '@/components/Input'

export default function AccountSection({ account, setAccount, logoutAndRedirect }) {
  return (
    <div className="space-y-6">
      <header><h2 className="text-xl font-bold text-text-primary flex items-center gap-2"><User size={20} className="text-primary" /> Profil & Organisation</h2></header>
      <Card className="premium-card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Prénom" value={account.firstName} onChange={e => setAccount(p => ({ ...p, firstName: e.target.value }))} />
          <Input label="Nom" value={account.lastName} onChange={e => setAccount(p => ({ ...p, lastName: e.target.value }))} />
        </div>
        <Input label="Email de connexion" value={account.email} disabled leftIcon={<Mail size={16} />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Entreprise" value={account.nomEntreprise} onChange={e => setAccount(p => ({ ...p, nomEntreprise: e.target.value }))} />
          <Input label="SIRET" value={account.siret} onChange={e => setAccount(p => ({ ...p, siret: e.target.value }))} />
        </div>
        <Input label="Adresse du siège" value={account.adresse} onChange={e => setAccount(p => ({ ...p, adresse: e.target.value }))} />
      </Card>
      <div className="flex justify-end">
         <button onClick={logoutAndRedirect} className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-red-500/5 transition-all">
           <LogOut size={14} /> Quitter la session
         </button>
      </div>
    </div>
  )
}

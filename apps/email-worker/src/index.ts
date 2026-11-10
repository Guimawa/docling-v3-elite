import PostalMime from 'postal-mime';
import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const parser = new PostalMime();
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const email = await parser.parse(rawEmail);

    if (!email.attachments || email.attachments.length === 0) {
      console.log('Aucune pièce jointe trouvée.');
      return;
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    for (const attachment of email.attachments) {
      // On ne prend que les PDF ou Images
      if (attachment.mimeType === 'application/pdf' || attachment.mimeType.startsWith('image/')) {
        const filePath = inbox/\-\;
        
        // 1. Upload vers Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('invoices')
          .upload(filePath, attachment.content);

        if (storageError) {
          console.error('Erreur Storage:', storageError.message);
          continue;
        }

        // 2. Création de l'entrée en base pour analyse IA ultérieure
        await supabase.from('invoices').insert({
          filename: attachment.filename,
          pdf_url: filePath,
          status: 'pending',
          source: 'email'
        });
        
        console.log(Facture \ ingérée avec succès.);
      }
    }
  },
};

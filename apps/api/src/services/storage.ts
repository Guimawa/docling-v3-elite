import { SupabaseClient } from '@supabase/supabase-js';

export class StorageService {
  constructor(private supabase: SupabaseClient) {}

  async checkDuplicate(fileName: string, userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('invoices')
      .select('id')
      .eq('user_id', userId)
      .eq('file_name', fileName)
      .limit(1);
    
    return data && data.length > 0;
  }

  async uploadFile(file: File, userId: string): Promise<string> {
    const path = `${userId}/${Date.now()}_${file.name}`;
    
    // Support hybride R2 / Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('scans')
      .upload(path, file);

    if (error) throw error;
    
    const { data: urlData } = this.supabase.storage
      .from('scans')
      .getPublicUrl(path);

    return urlData.publicUrl;
  }
}

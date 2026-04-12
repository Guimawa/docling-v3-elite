import { FileUp, FolderOpen, UploadCloud } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Zone de dépôt (dropzone) pour PDF et images.
 * UI uniquement — la logique est fournie par useScanUpload.
 */
export default function UploadZone({
  getRootProps,
  getInputProps,
  isDragActive,
  open,
  onSelectFolder,
  folderInputRef,
  onFolderInputChange,
}) {
  return (
    <div
      {...getRootProps()}
      data-testid="scan-dropzone"
      className={`relative mb-5 flex cursor-default flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-8 transition-all duration-300
        bg-elevated/90 shadow-md shadow-black/[0.05] ring-1 ring-text-primary/[0.04] backdrop-blur-md
        ${isDragActive
          ? 'scale-[1.01] border-primary-medium bg-primary-pale/80 shadow-amber-md ring-primary/20'
          : 'border-border/90 hover:border-primary/25 hover:bg-elevated hover:shadow-lg'
        }`}
    >
      <input {...getInputProps()} />
      <UploadCloud
        size={36}
        className={`transition-colors ${isDragActive ? 'text-primary' : 'text-text-secondary'}`}
      />
      <div className="text-center">
        <p className={`text-sm font-semibold ${isDragActive ? 'text-primary' : 'text-text-primary'}`}>
          {isDragActive ? 'Relâchez pour ajouter' : 'Glisser-déposer des PDF / images'}
        </p>
        <p className="mt-1 text-xs text-text-secondary">ou sélectionner un dossier (PDF récursif)</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); open() }}
          data-testid="scan-upload-btn"
          className="flex items-center gap-2 rounded-full border border-border/90 bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary shadow-xs transition-[background-color,box-shadow,border-color] hover:border-border-medium hover:bg-elevated hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <FileUp size={16} />
          Parcourir les fichiers
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onSelectFolder() }}
          className="flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-coral-btn px-4 py-2.5 text-sm font-semibold text-white shadow-amber-md transition-[box-shadow,filter] hover:shadow-amber-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <FolderOpen size={16} />
          Sélectionner un dossier
        </motion.button>
      </div>
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        webkitdirectory=""
        multiple
        accept=".pdf"
        onChange={onFolderInputChange}
      />
    </div>
  )
}

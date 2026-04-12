/**
 * Contenus pages légales publiques Docling — ton sobre, aligné produit, sans promesse juridique fictive.
 * Révision humaine recommandée avant mise en production « définitive ».
 */

function sectionsFR() {
  return {
    mentions: {
      title: 'Mentions légales',
      subtitle: 'Informations sur l’éditeur du site et de l’application Docling.',
      sections: [
        {
          h2: 'Éditeur',
          paragraphs: [
            'Le site et l’application **Docling** sont édités par la société ou l’entité responsable du déploiement que vous utilisez (ci-après « l’éditeur »).',
            'Pour toute question : **contact@docling.app** (adapter l’adresse si votre déploiement utilise un autre domaine de contact).',
          ],
        },
        {
          h2: 'Directeur de la publication',
          paragraphs: [
            'Le directeur de la publication est la personne physique ou morale désignée par l’éditeur pour le service Docling.',
          ],
        },
        {
          h2: 'Hébergement',
          paragraphs: [
            'Les contenus sont hébergés sur une infrastructure cloud (par ex. **Netlify** pour le front, **Google Cloud Run** ou équivalent pour l’API, selon votre déploiement). Les sous-traitants techniques sont ceux configurés dans votre environnement.',
          ],
        },
        {
          h2: 'Propriété intellectuelle',
          paragraphs: [
            'Les marques, logos et contenus Docling sont protégés. Toute reproduction non autorisée est interdite.',
          ],
        },
      ],
    },
    cgu: {
      title: 'Conditions générales d’utilisation',
      subtitle: 'Règles d’usage du service Docling.',
      sections: [
        {
          h2: 'Objet',
          paragraphs: [
            'Docling est une plateforme web d’aide à la **structuration de factures fournisseurs** (OCR et extraction assistée par IA), catalogue de prix et exports (CSV, Excel).',
          ],
        },
        {
          h2: 'Compte et accès',
          paragraphs: [
            'L’accès peut inclure un mode essai ou invité selon la configuration du serveur. Un compte permet de conserver historique et catalogue.',
            'Vous êtes responsable de la confidentialité de vos identifiants.',
          ],
        },
        {
          h2: 'Nature du service et limites',
          paragraphs: [
            'L’extraction est **assistée par IA** : vous devez **valider ou corriger** les données avant de les enregistrer. Docling ne se substitue pas à votre jugement métier, comptable ou fiscal.',
            'L’éditeur ne garantit pas une exactitude absolue des montants ou libellés extraits ; la responsabilité de l’éditeur est limitée aux obligations légales applicables et au fonctionnement décrit dans la documentation.',
          ],
        },
        {
          h2: 'Données et conformité',
          paragraphs: [
            'Le traitement des données personnelles est décrit dans la **Politique de confidentialité**. Vous pouvez exercer vos droits (accès, rectification, suppression, etc.) via les canaux indiqués.',
          ],
        },
        {
          h2: 'Modification des CGU',
          paragraphs: [
            'Les présentes CGU peuvent être mises à jour ; la date de dernière mise à jour peut être précisée en tête de page lors des évolutions majeures.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Politique de confidentialité',
      subtitle: 'Traitement des données personnelles et droits (RGPD).',
      sections: [
        {
          h2: 'Responsable du traitement',
          paragraphs: [
            'Le responsable du traitement est l’éditeur du service Docling pour votre déploiement. Contact : **contact@docling.app** (à adapter).',
          ],
        },
        {
          h2: 'Données collectées',
          paragraphs: [
            'Données de compte (identifiant, e-mail selon configuration), **contenu des factures** importées, données de catalogue et d’historique, journaux techniques (sécurité, diagnostic).',
          ],
        },
        {
          h2: 'Finalités et bases légales',
          paragraphs: [
            'Fourniture du service (exécution du contrat), sécurité, amélioration du produit, obligations légales le cas échéant.',
          ],
        },
        {
          h2: 'Sous-traitants et transferts',
          paragraphs: [
            'Hébergement base de données (**PostgreSQL**, ex. Neon), stockage fichiers (**S3 compatible**, ex. Storj), **modèles d’IA** (ex. Google Gemini) pour l’analyse de documents. Les flux sont ceux décrits dans votre déploiement.',
          ],
        },
        {
          h2: 'Durées de conservation',
          paragraphs: [
            'Les données sont conservées pendant la durée d’utilisation du service et des délais légaux ou contractuels applicables. Les exports et suppressions peuvent être proposés depuis les réglages selon version.',
          ],
        },
        {
          h2: 'Vos droits',
          paragraphs: [
            'Droit d’accès, rectification, effacement, limitation, opposition, portabilité — contactez l’éditeur. Réclamation auprès de l’autorité de protection des données compétente (ex. CNIL en France).',
          ],
        },
        {
          h2: 'Signalement d’usurpation ou fraude',
          paragraphs: [
            'Si vous constatez une utilisation frauduleuse de la marque Docling ou un hameçonnage, écrivez à **contact@docling.app** avec le maximum d’éléments (URL, captures).',
          ],
          id: 'signalement-fraude',
        },
        {
          h2: 'Incident de données personnelles',
          paragraphs: [
            'En cas de violation de données susceptible d’affecter vos droits, l’éditeur documente l’incident et, lorsque la loi l’exige, effectue les notifications aux personnes et autorités concernées. Contact : **contact@docling.app**.',
          ],
          id: 'incident-donnees',
        },
      ],
    },
    accessibility: {
      title: 'Accessibilité numérique',
      subtitle: 'Déclaration de conformité — état au regard du référentiel français (RGAA).',
      sections: [
        {
          h2: 'Statut',
          paragraphs: [
            'Docling vise une **accessibilité continue** de son interface web. À ce jour, le service est considéré comme **partiellement conforme** au RGAA 4 : des écarts peuvent subsister (contraste ponctuel, composants tiers, contenus dynamiques).',
            'Cette déclaration sera mise à jour lors des corrections majeures ou d’un audit formel.',
          ],
        },
        {
          h2: 'Amélioration continue',
          paragraphs: [
            'Priorité aux parcours critiques (connexion, scan, validation, export), navigation clavier, intitulés de liens, alternatives textuelles lorsque c’est pertinent.',
          ],
        },
        {
          h2: 'Signaler un obstacle',
          paragraphs: [
            'Si vous rencontrez un blocage d’accès, écrivez à **accessibilite@docling.app** (ou **contact@docling.app** en attendant une boîte dédiée). Nous étudions chaque retour.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Politique relative aux cookies et traceurs',
      subtitle: 'Transparence sur les cookies et stockages utilisés.',
      sections: [
        {
          h2: 'Cookies et stockage nécessaires',
          paragraphs: [
            'Docling utilise des cookies ou stockages navigateur **strictement nécessaires** à la session, à la sécurité (ex. jeton en cookie httpOnly côté serveur, préférences de langue publique en local) et au fonctionnement de l’application.',
          ],
        },
        {
          h2: 'Pas de publicité comportementale par défaut',
          paragraphs: [
            'Le service ne vise pas la vente de données publicitaires. Si des mesures d’audience anonymisées ou des intégrations tierces (ex. vidéo embed) sont activées sur votre déploiement, elles seront listées ici et, le cas échéant, soumises à votre consentement.',
          ],
        },
        {
          h2: 'Gestion',
          paragraphs: [
            'Vous pouvez configurer votre navigateur pour refuser certains cookies ; le refus des cookies essentiels peut empêcher l’utilisation normale du service.',
          ],
        },
      ],
    },
    sitemap: {
      title: 'Plan du site',
      subtitle: 'Pages publiques principales de Docling.',
      intro: 'Liens vers les entrées publiques du site (hors espace connecté).',
      links: [
        { to: '/', label: 'Accueil' },
        { to: '/tarifs', label: 'Tarifs' },
        { to: '/a-propos', label: 'À propos' },
        { to: '/aide', label: 'Aide' },
        { to: '/integrations', label: 'Intégrations' },
        { to: '/login', label: 'Connexion' },
        { to: '/register', label: 'Inscription' },
        { to: '/mentions-legales', label: 'Mentions légales' },
        { to: '/cgu', label: 'CGU' },
        { to: '/confidentialite', label: 'Confidentialité' },
        { to: '/accessibilite', label: 'Accessibilité' },
        { to: '/cookies', label: 'Cookies' },
        { to: '/plan-du-site', label: 'Plan du site' },
      ],
    },
  }
}

function sectionsES() {
  return {
    mentions: {
      title: 'Aviso legal',
      subtitle: 'Información sobre el editor del sitio y la aplicación Docling.',
      sections: [
        {
          h2: 'Editor',
          paragraphs: [
            'El sitio y la aplicación **Docling** son editados por la entidad responsable del despliegue que utiliza (en adelante, « el editor »).',
            'Contacto: **contact@docling.app** (adaptar si su despliegue usa otro dominio).',
          ],
        },
        {
          h2: 'Responsable de publicación',
          paragraphs: [
            'La persona física o jurídica designada por el editor para el servicio Docling.',
          ],
        },
        {
          h2: 'Alojamiento',
          paragraphs: [
            'Los contenidos se alojan en infraestructura cloud (p. ej. **Netlify** para el front, **Google Cloud Run** o equivalente para la API, según despliegue).',
          ],
        },
        {
          h2: 'Propiedad intelectual',
          paragraphs: [
            'Marcas, logotipos y contenidos Docling están protegidos. Queda prohibida la reproducción no autorizada.',
          ],
        },
      ],
    },
    cgu: {
      title: 'Condiciones generales de uso',
      subtitle: 'Normas de uso del servicio Docling.',
      sections: [
        {
          h2: 'Objeto',
          paragraphs: [
            'Docling es una plataforma web para **estructurar facturas de proveedores** (OCR y extracción asistida por IA), catálogo de precios y exportaciones (CSV, Excel).',
          ],
        },
        {
          h2: 'Cuenta y acceso',
          paragraphs: [
            'El acceso puede incluir prueba o modo invitado según configuración. Una cuenta conserva historial y catálogo.',
            'Usted es responsable de la confidencialidad de sus credenciales.',
          ],
        },
        {
          h2: 'Naturaleza del servicio y límites',
          paragraphs: [
            'La extracción es **asistida por IA**: debe **validar o corregir** los datos antes de guardarlos. Docling no sustituye su criterio profesional, contable o fiscal.',
            'El editor no garantiza exactitud absoluta; la responsabilidad se limita a lo previsto por la ley y la documentación del servicio.',
          ],
        },
        {
          h2: 'Datos y cumplimiento',
          paragraphs: [
            'El tratamiento de datos personales se describe en la **Política de privacidad**.',
          ],
        },
        {
          h2: 'Modificación de las CGU',
          paragraphs: [
            'Estas condiciones pueden actualizarse; la fecha de última revisión puede indicarse en cabecera ante cambios importantes.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de privacidad',
      subtitle: 'Tratamiento de datos personales y derechos (RGPD).',
      sections: [
        {
          h2: 'Responsable del tratamiento',
          paragraphs: [
            'El responsable es el editor del servicio Docling en su despliegue. Contacto: **contact@docling.app**.',
          ],
        },
        {
          h2: 'Datos recogidos',
          paragraphs: [
            'Datos de cuenta (identificador, e-mail según configuración), **contenido de facturas** importadas, catálogo e historial, registros técnicos (seguridad, diagnóstico).',
          ],
        },
        {
          h2: 'Finalidades y bases legales',
          paragraphs: [
            'Prestación del servicio (ejecución del contrato), seguridad, mejora del producto, obligaciones legales si procede.',
          ],
        },
        {
          h2: 'Encargados y transferencias',
          paragraphs: [
            'Base de datos (**PostgreSQL**, p. ej. Neon), almacenamiento de archivos (**S3 compatible**, p. ej. Storj), **modelos de IA** (p. ej. Google Gemini) para análisis de documentos.',
          ],
        },
        {
          h2: 'Plazos de conservación',
          paragraphs: [
            'Los datos se conservan mientras use el servicio y los plazos legales o contractuales aplicables. Exportación y borrado pueden estar disponibles en ajustes según versión.',
          ],
        },
        {
          h2: 'Sus derechos',
          paragraphs: [
            'Acceso, rectificación, supresión, limitación, oposición, portabilidad — contacte al editor. Reclamación ante la autoridad de protección de datos competente.',
          ],
        },
        {
          h2: 'Informe de suplantación o fraude',
          paragraphs: [
            'Si detecta uso fraudulento de la marca Docling o phishing, escriba a **contact@docling.app** con URL y capturas si es posible.',
          ],
          id: 'signalement-fraude',
        },
        {
          h2: 'Incidente de datos personales',
          paragraphs: [
            'En caso de violación que afecte sus derechos, el editor documenta el incidente y, cuando la ley lo exija, notifica a las personas y autoridades. Contacto: **contact@docling.app**.',
          ],
          id: 'incident-donnees',
        },
      ],
    },
    accessibility: {
      title: 'Accesibilidad digital',
      subtitle: 'Declaración de conformidad (referencia RGAA, enfoque equivalente).',
      sections: [
        {
          h2: 'Estado',
          paragraphs: [
            'Docling trabaja la **accesibilidad** de forma continua. Hoy el servicio se considera **parcialmente conforme**: pueden subsistir lagunas (contraste puntual, componentes de terceros, contenido dinámico).',
            'Esta declaración se actualizará tras correcciones importantes o una auditoría formal.',
          ],
        },
        {
          h2: 'Mejora continua',
          paragraphs: [
            'Prioridad a flujos críticos (inicio de sesión, escaneo, validación, exportación), teclado, etiquetas de enlaces, alternativas de texto cuando aplique.',
          ],
        },
        {
          h2: 'Señalar un obstáculo',
          paragraphs: [
            'Escriba a **accessibilite@docling.app** o **contact@docling.app** si encuentra una barrera de acceso.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Política de cookies y rastreadores',
      subtitle: 'Transparencia sobre cookies y almacenamiento.',
      sections: [
        {
          h2: 'Cookies y almacenamiento necesarios',
          paragraphs: [
            'Docling utiliza cookies o almacenamiento del navegador **estrictamente necesarios** para la sesión, la seguridad y el funcionamiento de la aplicación.',
          ],
        },
        {
          h2: 'Sin publicidad comportamental por defecto',
          paragraphs: [
            'El servicio no persigue la venta de datos publicitarios. Si se activan analíticas o embeds de terceros en su despliegue, se listarán aquí y, si procede, se pedirá consentimiento.',
          ],
        },
        {
          h2: 'Gestión',
          paragraphs: [
            'Puede configurar el navegador para rechazar cookies; rechazar las esenciales puede impedir el uso normal del servicio.',
          ],
        },
      ],
    },
    sitemap: {
      title: 'Mapa del sitio',
      subtitle: 'Páginas públicas principales de Docling.',
      intro: 'Enlaces a las entradas públicas (fuera del área conectada).',
      links: [
        { to: '/', label: 'Inicio' },
        { to: '/tarifs', label: 'Precios' },
        { to: '/a-propos', label: 'Acerca de' },
        { to: '/aide', label: 'Ayuda' },
        { to: '/integrations', label: 'Integraciones' },
        { to: '/login', label: 'Iniciar sesión' },
        { to: '/register', label: 'Registro' },
        { to: '/mentions-legales', label: 'Aviso legal' },
        { to: '/cgu', label: 'Condiciones de uso' },
        { to: '/confidentialite', label: 'Privacidad' },
        { to: '/accessibilite', label: 'Accesibilidad' },
        { to: '/cookies', label: 'Cookies' },
        { to: '/plan-du-site', label: 'Mapa del sitio' },
      ],
    },
  }
}

function sectionsCA() {
  return {
    mentions: {
      title: 'Mencions legals',
      subtitle: 'Informació sobre l’editor del lloc i l’aplicació Docling.',
      sections: [
        {
          h2: 'Editor',
          paragraphs: [
            'El lloc i l’aplicació **Docling** són editats per l’entitat responsable del desplegament que feu servir (en endavant, « l’editor »).',
            'Contacte: **contact@docling.app** (adapteu si el desplegament usa un altre domini).',
          ],
        },
        {
          h2: 'Director de publicació',
          paragraphs: [
            'La persona física o jurídica designada per l’editor per al servei Docling.',
          ],
        },
        {
          h2: 'Allotjament',
          paragraphs: [
            'Els continguts s’allotgen en infraestructura cloud (p. ex. **Netlify** per al front, **Google Cloud Run** o equivalent per a l’API, segons desplegament).',
          ],
        },
        {
          h2: 'Propietat intel·lectual',
          paragraphs: [
            'Marques, logotips i continguts Docling estan protegits. Queda prohibida la reproducció no autoritzada.',
          ],
        },
      ],
    },
    cgu: {
      title: 'Condicions generals d’ús',
      subtitle: 'Normes d’ús del servei Docling.',
      sections: [
        {
          h2: 'Objecte',
          paragraphs: [
            'Docling és una plataforma web per **estructurar factures de proveïdors** (OCR i extracció assistida per IA), catàleg de preus i exportacions (CSV, Excel).',
          ],
        },
        {
          h2: 'Compte i accés',
          paragraphs: [
            'L’accés pot incloure prova o mode convidat segons configuració. Un compte conserva historial i catàleg.',
            'Sou responsable de la confidencialitat de les credencials.',
          ],
        },
        {
          h2: 'Natura del servei i límits',
          paragraphs: [
            'L’extracció és **assistida per IA**: heu de **validar o corregir** les dades abans de desar-les. Docling no substitueix el criteri professional, comptable o fiscal.',
            'L’editor no garanteix exactitud absoluta; la responsabilitat es limita al que preveu la llei i la documentació del servei.',
          ],
        },
        {
          h2: 'Dades i compliment',
          paragraphs: [
            'El tractament de dades personals es descriu a la **Política de confidencialitat**.',
          ],
        },
        {
          h2: 'Modificació de les CGU',
          paragraphs: [
            'Aquestes condicions poden actualitzar-se; la data de darrera revisió es pot indicar al capdamunt davant canvis importants.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de confidencialitat',
      subtitle: 'Tractament de dades personals i drets (RGPD).',
      sections: [
        {
          h2: 'Responsable del tractament',
          paragraphs: [
            'El responsable és l’editor del servei Docling al vostre desplegament. Contacte: **contact@docling.app**.',
          ],
        },
        {
          h2: 'Dades recollides',
          paragraphs: [
            'Dades de compte (identificador, e-mail segons configuració), **contingut de factures** importades, catàleg i historial, registres tècnics (seguretat, diagnòstic).',
          ],
        },
        {
          h2: 'Finalitats i bases legals',
          paragraphs: [
            'Prestació del servei (execució del contracte), seguretat, millora del producte, obligacions legals si escau.',
          ],
        },
        {
          h2: 'Encarregats i transferències',
          paragraphs: [
            'Base de dades (**PostgreSQL**, p. ex. Neon), emmagatzematge d’arxius (**S3 compatible**, p. ex. Storj), **models d’IA** (p. ex. Google Gemini) per a l’anàlisi de documents.',
          ],
        },
        {
          h2: 'Terminis de conservació',
          paragraphs: [
            'Les dades es conserven mentre feu servir el servei i els terminis legals o contractuals aplicables. Exportació i supressió poden estar disponibles a configuració segons versió.',
          ],
        },
        {
          h2: 'Els vostres drets',
          paragraphs: [
            'Accés, rectificació, supressió, limitació, oposició, portabilitat — contacteu l’editor. Reclamació davant l’autoritat de protecció de dades competent.',
          ],
        },
        {
          h2: 'Senyalament d’usurpació o frau',
          paragraphs: [
            'Si detecteu ús fraudulent de la marca Docling o phishing, escriviu a **contact@docling.app** amb URL i captures si és possible.',
          ],
          id: 'signalement-fraude',
        },
        {
          h2: 'Incident de dades personals',
          paragraphs: [
            'En cas de violació que afecti els vostres drets, l’editor documenta l’incident i, quan la llei ho exigeix, notifica les persones i autoritats. Contacte: **contact@docling.app**.',
          ],
          id: 'incident-donnees',
        },
      ],
    },
    accessibility: {
      title: 'Accessibilitat digital',
      subtitle: 'Declaració de conformitat (referència RGAA, enfoc equivalent).',
      sections: [
        {
          h2: 'Estat',
          paragraphs: [
            'Docling treballa l’**accessibilitat** de forma contínua. Avui el servei es considera **parcialment conforme**: poden subsistir llacunes (contrast puntual, components de tercers, contingut dinàmic).',
            'Aquesta declaració s’actualitzarà després de correccions importants o una auditoria formal.',
          ],
        },
        {
          h2: 'Millora contínua',
          paragraphs: [
            'Prioritat als fluxos crítics (inici de sessió, escaneig, validació, exportació), teclat, etiquetes d’enllaços, alternatives de text quan escaigui.',
          ],
        },
        {
          h2: 'Senyalar un obstacle',
          paragraphs: [
            'Escriviu a **accessibilite@docling.app** o **contact@docling.app** si trobeu una barrera d’accés.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Política de galetes i rastrejadors',
      subtitle: 'Transparència sobre galetes i emmagatzematge.',
      sections: [
        {
          h2: 'Galetes i emmagatzematge necessaris',
          paragraphs: [
            'Docling utilitza galetes o emmagatzematge del navegador **estrictament necessaris** per a la sessió, la seguretat i el funcionament de l’aplicació.',
          ],
        },
        {
          h2: 'Sense publicitat comportamental per defecte',
          paragraphs: [
            'El servei no persegueix la venda de dades publicitàries. Si s’activen analítiques o embeds de tercers al vostre desplegament, es llistaran aquí i, si escau, es demanarà consentiment.',
          ],
        },
        {
          h2: 'Gestió',
          paragraphs: [
            'Podeu configurar el navegador per rebutjar galetes; rebutjar les essencials pot impedir l’ús normal del servei.',
          ],
        },
      ],
    },
    sitemap: {
      title: 'Pla del lloc',
      subtitle: 'Pàgines públiques principals de Docling.',
      intro: 'Enllaços a les entrades públiques (fora de l’espai connectat).',
      links: [
        { to: '/', label: 'Inici' },
        { to: '/tarifs', label: 'Preus' },
        { to: '/a-propos', label: 'Sobre nosaltres' },
        { to: '/aide', label: 'Ajuda' },
        { to: '/integrations', label: 'Integracions' },
        { to: '/login', label: 'Iniciar sessió' },
        { to: '/register', label: 'Registre' },
        { to: '/mentions-legales', label: 'Mencions legals' },
        { to: '/cgu', label: 'Condicions d’ús' },
        { to: '/confidentialite', label: 'Confidencialitat' },
        { to: '/accessibilite', label: 'Accessibilitat' },
        { to: '/cookies', label: 'Galetes' },
        { to: '/plan-du-site', label: 'Pla del lloc' },
      ],
    },
  }
}

export const LEGAL_I18N = {
  fr: { pages: sectionsFR() },
  es: { pages: sectionsES() },
  ca: { pages: sectionsCA() },
}

/** Clés de page → chemin URL */
export const LEGAL_PAGE_PATHS = {
  mentions: '/mentions-legales',
  cgu: '/cgu',
  privacy: '/confidentialite',
  accessibility: '/accessibilite',
  cookies: '/cookies',
  sitemap: '/plan-du-site',
}

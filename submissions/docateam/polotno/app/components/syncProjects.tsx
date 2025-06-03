import { observer } from 'mobx-react-lite';
import { InputGroup, Button, Dialog } from '@blueprintjs/core';
import { SectionTab } from 'polotno/side-panel';
import { MdFolder } from 'react-icons/md';
import { WiStars } from 'react-icons/wi';
import {fetchSyncedProjects, type SyncedProject} from '../api/syncedProjects';
import React from "react";
import { generateAndSaveProject } from '../api/ia';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const SyncedProjectsPanel = observer(({ store }) => {
  const [projects, setProjects] = React.useState<SyncedProject[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('Fais une présentation sur le bac de Français');
  const [showSpinner, setShowSpinner] = React.useState(false);

  async function loadProjects() {
    try {
      setShowSpinner(true);
      const data = await fetchSyncedProjects();
      setProjects(data.filter((project) =>
          project.filename.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } catch (error) {
      console.error('Erreur lors du chargement des projets synchronisés:', error);
    } finally {
      setShowSpinner(false);
    }
  }

  React.useEffect(() => {
    loadProjects();
  }, [searchTerm]);

  const openProject = async (project: SyncedProject) => {
    try {
      // Téléchargement du fichier du projet via l'URL
      const response = await fetch(project.url);
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du projet');
      }

      const projectData = await response.json();

      store.loadJSON(projectData);

      console.log('Projet chargé avec succès:', project.filename);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du projet:', error);
      alert('Impossible d\'ouvrir le projet.');
    }
  };

  const handleCreateWithAI = async () => {
    try {
      setShowSpinner(true);
      setIsModalOpen(false);
      console.log('Prompt saisi :', prompt);
      await generateAndSaveProject(prompt, store);
      await loadProjects();
      alert('Projet généré et sauvegardé dans Fichiers avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du projet avec l\'IA :', error);
      alert('Une erreur est survenue lors de la génération du projet.');
    } finally {
      setShowSpinner(false);
    }
  };

  return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showSpinner && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}>
              <div style={{ textAlign: 'center', color: 'white', marginTop: '20px', fontSize: '24px' }}>
                <DotLottieReact src="https://lottie.host/5ddf4fbb-2a7b-4034-95de-7435418e9d75/jUlSaalll6.lottie" loop autoplay style={{ width: '500px' }} />
                <p>Génération en cours ...</p>
              </div>
            </div>
        )}

        <Button
            intent="success"
            onClick={() => setIsModalOpen(true)}
            style={{ margin: '10px' }}
        >
          Créer avec l'IA
          <WiStars size={24} />
        </Button>

        <Dialog
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Créer avec l'IA"
        >
          <div className="bp4-dialog-body">
            <p>Saisissez un prompt pour générer un projet :</p>
            <InputGroup
                placeholder="Entrez votre prompt ici..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="bp4-dialog-footer">
            <div className="bp4-dialog-footer-actions">
              <Button onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button intent="primary" onClick={handleCreateWithAI}>
                Générer
              </Button>
            </div>
          </div>
        </Dialog>

        <InputGroup
            leftIcon="search"
            placeholder="Rechercher..."
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              marginBottom: '20px',
            }}
        />
        <p>Projets synchronisés :</p>
        <ul>
          {projects.map((project) => (
              <li
                  key={project.id}
                  onClick={() => openProject(project)}
                  style={{ cursor: 'pointer', marginBottom: '10px' }}
              >
                <strong>{project.filename}</strong> ({new Date(project.updated_at).toLocaleString()})
              </li>
          ))}
        </ul>
      </div>
  );
});

export const CustomSyncedProjects = {
  name: 'synced-projects',
  Tab: (props) => (
      <SectionTab name="Projects" {...props}>
        <MdFolder />
      </SectionTab>
  ),
  Panel: SyncedProjectsPanel,
};
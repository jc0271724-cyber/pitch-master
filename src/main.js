// PitchMaster Main Entry Point
import { AppController } from './app.js';
import { PitchWheelComponent } from './components/pitchWheel.js';
import { SolfegeComponent } from './components/solfege.js';
import { QRModalComponent } from './components/qrModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core PitchMaster App Controller
  const app = new AppController();
  app.init();

  // Mount Pitch Pipe Wheel component inside Pitch Pipe tab
  const pitchpipeContainer = document.querySelector('#pitchpipe-wheel-container');
  if (pitchpipeContainer) {
    const pitchWheelComp = new PitchWheelComponent(pitchpipeContainer);
    pitchWheelComp.render();
  }

  // Mount Solfege Hand Signs component inside Solfege tab
  const solfegeContainer = document.querySelector('#solfege-cards-container');
  if (solfegeContainer) {
    const solfegeComp = new SolfegeComponent(solfegeContainer);
    solfegeComp.render();
  }

  // Mount QR Code Sharing Modal
  const qrModalContainer = document.querySelector('#qr-modal-container');
  if (qrModalContainer) {
    const qrModalComp = new QRModalComponent(qrModalContainer);
    qrModalComp.render();

    const openQrBtn = document.querySelector('#open-qr-btn');
    if (openQrBtn) {
      openQrBtn.addEventListener('click', () => {
        qrModalComp.show();
      });
    }
  }
});

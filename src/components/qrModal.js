// QR Code Generator Modal for Instant Phone Access (Public HTTPS & Local Network Support)
import QRCode from 'qrcode';

export class QRModalComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.lanIp = null;
    this.publicTunnelUrl = 'https://jc0271724-cyber.github.io/pitch-master/';
    this.detectLanIP();
  }

  detectLanIP() {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) return;
        const candidate = event.candidate.candidate;
        const match = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (match && match[1] && !match[1].startsWith('127.')) {
          this.lanIp = match[1];
          try { pc.close(); } catch (e) {}
          this.updateUrlOptions();
        }
      };
      setTimeout(() => {
        try { pc.close(); } catch (e) {}
      }, 1200);
    } catch (e) {
      console.warn('WebRTC LAN IP detection failed', e);
    }
  }

  getCleanAppUrl(host) {
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol || 'http:';
    const targetHost = host || this.lanIp || window.location.hostname || '10.0.0.143';
    return `${protocol}//${targetHost}${port}/`;
  }

  render() {
    if (!this.container) return;

    const defaultUrl = this.publicTunnelUrl;

    this.container.innerHTML = `
      <div class="modal-backdrop" id="qr-modal-backdrop">
        <div class="modal-card glass-panel">
          <button class="modal-close-btn" id="qr-modal-close">×</button>

          <div class="modal-header">
            <h3>📱 Scan to Open PitchMaster Website</h3>
            <p>Scan with your iPhone or Android camera to open the PitchMaster web app from anywhere!</p>
          </div>

          <div class="qr-code-body">
            <!-- Web Address Source Selector -->
            <div class="qr-url-box">
              <label for="qr-ip-select">Target Web Address:</label>
              <select id="qr-ip-select" class="custom-select full-width-select">
                <!-- Options populated dynamically -->
              </select>
            </div>

            <!-- QR Code Canvas -->
            <div class="qr-canvas-wrapper">
              <canvas id="qr-code-canvas"></canvas>
            </div>

            <div class="qr-url-box">
              <label for="qr-url-input">Scanned Web URL:</label>
              <div class="url-input-group">
                <input type="text" id="qr-url-input" class="custom-input" value="${defaultUrl}">
                <button class="btn btn-secondary" id="qr-copy-btn">Copy Link</button>
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 10px; width: 100%; display: flex; gap: 8px;">
              <a id="qr-test-link" href="${defaultUrl}" target="_blank" class="btn btn-primary" style="flex:1; justify-content:center; text-decoration:none;">
                🌐 Open Website in Browser
              </a>
            </div>

            <div class="safari-warning-box" style="margin-top: 12px; font-size: 12px; line-height: 1.45; padding: 10px 12px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #a7f3d0;">
              ✨ <strong>No Localhost Required!</strong> This QR code uses a direct public web link. Works instantly on 5G, LTE, cellular data, or any Wi-Fi connection without needing localhost!
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateUrlOptions();
  }

  updateUrlOptions() {
    const ipSelect = this.container.querySelector('#qr-ip-select');
    if (!ipSelect) return;

    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol || 'http:';

    const options = [
      { label: `🌐 Public Live Web URL (${this.publicTunnelUrl})`, url: this.publicTunnelUrl }
    ];

    if (this.lanIp) {
      options.push({ label: `📶 Local Wi-Fi Network (${protocol}//${this.lanIp}${port}/)`, url: `${protocol}//${this.lanIp}${port}/` });
    } else {
      options.push({ label: `📶 Local Wi-Fi Network (${protocol}//10.0.0.143${port}/)`, url: `${protocol}//10.0.0.143${port}/` });
    }

    options.push({ label: `💻 Computer Localhost (${protocol}//localhost${port}/)`, url: `${protocol}//localhost${port}/` });

    ipSelect.innerHTML = options.map(o => `<option value="${o.url}">${o.label}</option>`).join('');

    // Default to public live URL
    this.setTargetUrl(this.publicTunnelUrl);
  }

  attachEvents() {
    const backdrop = this.container.querySelector('#qr-modal-backdrop');
    const closeBtn = this.container.querySelector('#qr-modal-close');
    const ipSelect = this.container.querySelector('#qr-ip-select');
    const urlInput = this.container.querySelector('#qr-url-input');
    const copyBtn = this.container.querySelector('#qr-copy-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.hide();
      });
    }

    if (ipSelect) {
      ipSelect.addEventListener('change', (e) => {
        this.setTargetUrl(e.target.value);
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        this.setTargetUrl(e.target.value);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#qr-url-input');
        if (input) {
          navigator.clipboard.writeText(input.value);
          copyBtn.textContent = 'Copied! ✓';
          setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
        }
      });
    }
  }

  setTargetUrl(url) {
    if (!url) return;
    const cleanUrl = url.startsWith('http') ? url : `http://${url}`;
    const urlInput = this.container.querySelector('#qr-url-input');
    const testLink = this.container.querySelector('#qr-test-link');

    if (urlInput && urlInput.value !== cleanUrl) urlInput.value = cleanUrl;
    if (testLink) testLink.href = cleanUrl;

    this.generateQR(cleanUrl);
  }

  show() {
    const backdrop = this.container.querySelector('#qr-modal-backdrop');
    if (backdrop) backdrop.classList.add('visible');
    this.updateUrlOptions();
  }

  hide() {
    const backdrop = this.container.querySelector('#qr-modal-backdrop');
    if (backdrop) backdrop.classList.remove('visible');
  }

  generateQR(text) {
    const canvas = this.container.querySelector('#qr-code-canvas');
    if (!canvas || !text) return;

    QRCode.toCanvas(canvas, text, {
      width: 220,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff'
      }
    }, function (error) {
      if (error) console.error('QR Code Generation Error:', error);
    });
  }
}

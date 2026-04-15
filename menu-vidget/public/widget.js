(function() {
  'use strict';
  
  class RecommendationWidget {
    constructor(config) {
      this.config = {
        apiUrl: 'https://menu-vidget.vercel.app',
        siteDomain: window.location.hostname,
        position: 'bottom-right',
        themeColor: '#3B82F6',
        title: 'Рекомендуем для вас',
        maxProducts: 5,
        showImages: true,
        showPrices: true,
        ...config
      };
      
      this.clientId = null;
      this.sessionId = null;
      this.widgetElement = null;
      this.isOpen = true;
    }
    
    async init() {
      console.log('🚀 Widget initializing...');
      await this.identify();
      this.injectStyles();
      this.createWidget();
      this.trackPageView();
      this.attachEventListeners();
      await this.loadRecommendations();
    }
    
    async identify() {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/identify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Domain': this.config.siteDomain
          },
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Identification failed');
        
        const data = await response.json();
        this.clientId = data.clientId;
        this.sessionId = data.sessionId;
        
        if (data.widgetConfig) {
          this.config = { ...this.config, ...data.widgetConfig.theme, ...data.widgetConfig.display };
        }
        
        console.log('✅ Identified:', { clientId: this.clientId, sessionId: this.sessionId });
      } catch (error) {
        console.error('❌ Identification error:', error);
      }
    }
    
    async trackEvent(eventType, productId = null, metadata = {}) {
      if (!this.clientId) return;
      
      try {
        await fetch(`${this.config.apiUrl}/api/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Domain': this.config.siteDomain
          },
          credentials: 'include',
          body: JSON.stringify({
            clientId: this.clientId,
            sessionId: this.sessionId,
            eventType,
            productId,
            metadata: {
              ...metadata,
              url: window.location.href,
              timestamp: Date.now()
            }
          })
        });
        
        console.log(`📊 Tracked: ${eventType}`, productId ? `Product: ${productId}` : '');
      } catch (error) {
        console.error('❌ Tracking error:', error);
      }
    }
    
    trackPageView() {
      this.trackEvent('page_view');
    }
    
    attachEventListeners() {
      // Track product views via Intersection Observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const productId = element.dataset.widgetProduct;
            if (productId && !element.dataset.tracked) {
              element.dataset.tracked = 'true';
              this.trackEvent('view_product', parseInt(productId));
            }
          }
        });
      }, { threshold: 0.5 });
      
      document.querySelectorAll('[data-widget-product]').forEach(el => observer.observe(el));
      
      // Track category views
      document.querySelectorAll('[data-widget-category]').forEach(el => {
        if (!el.dataset.categoryTracked) {
          el.dataset.categoryTracked = 'true';
          const category = el.dataset.widgetCategory;
          this.trackEvent('view_category', null, { category });
        }
      });
    }
    
    async loadRecommendations() {
      if (!this.clientId) return;
      
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/recommendations/${this.clientId}?site_domain=${this.config.siteDomain}`,
          { credentials: 'include' }
        );
        
        if (!response.ok) throw new Error('Failed to load recommendations');
        
        const data = await response.json();
        this.renderProducts(data.products);
      } catch (error) {
        console.error('❌ Failed to load recommendations:', error);
        this.renderFallback();
      }
    }
    
    renderProducts(products) {
      if (!products || products.length === 0) {
        this.widgetElement.style.display = 'none';
        return;
      }
      
      const content = this.widgetElement.querySelector('.widget-content');
      if (!content) return;
      
      const productsToShow = products.slice(0, this.config.maxProducts);
      
      const productsHtml = productsToShow.map(product => `
        <div class="widget-product" data-widget-product="${product.id}" onclick="window.widgetInstance && window.widgetInstance.handleProductClick(${product.id})">
          ${this.config.showImages && product.image_url ? 
            `<img src="${product.image_url}" alt="${this.escapeHtml(product.name)}" class="widget-product-image" loading="lazy" 
                 onerror="this.src='https://via.placeholder.com/60?text=No+Image'">` : ''}
          <div class="widget-product-info">
            <div class="widget-product-name">${this.escapeHtml(product.name)}</div>
            ${this.config.showPrices && product.price ? 
              `<div class="widget-product-price">${product.price} ₽</div>` : ''}
            ${product.product_url ? 
              `<a href="${product.product_url}" target="_blank" rel="noopener noreferrer" class="widget-product-link" 
                    onclick="event.stopPropagation()">Подробнее →</a>` : ''}
          </div>
        </div>
      `).join('');
      
      content.innerHTML = productsHtml;
      this.widgetElement.style.display = 'block';
    }
    
    renderFallback() {
      const content = this.widgetElement.querySelector('.widget-content');
      if (content) {
        content.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #666;">
            <p>😊 Рекомендации появятся позже</p>
          </div>
        `;
      }
    }
    
    handleProductClick(productId) {
      this.trackEvent('click', productId);
    }
    
    createWidget() {
      // Remove existing widget
      const existing = document.getElementById('widget-recommendations');
      if (existing) existing.remove();
      
      // Create widget container
      this.widgetElement = document.createElement('div');
      this.widgetElement.id = 'widget-recommendations';
      this.widgetElement.className = `widget-container widget-${this.config.position}`;
      
      this.widgetElement.innerHTML = `
        <div class="widget-header" style="background-color: ${this.config.themeColor}">
          <h3>${this.escapeHtml(this.config.title)}</h3>
          <button class="widget-close" aria-label="Close">×</button>
        </div>
        <div class="widget-content">
          <div style="text-align: center; padding: 20px;">
            <div class="widget-loader"></div>
            <p style="color: #666; margin-top: 10px;">Загрузка рекомендаций...</p>
          </div>
        </div>
      `;
      
      document.body.appendChild(this.widgetElement);
      
      // Close button handler
      const closeBtn = this.widgetElement.querySelector('.widget-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.widgetElement.style.display = 'none';
          this.isOpen = false;
        });
      }
      
      // Make widget draggable
      this.makeDraggable();
    }
    
    makeDraggable() {
      const header = this.widgetElement.querySelector('.widget-header');
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      
      header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('widget-close')) return;
        
        isDragging = true;
        initialX = e.clientX - this.widgetElement.offsetLeft;
        initialY = e.clientY - this.widgetElement.offsetTop;
        
        this.widgetElement.style.cursor = 'grabbing';
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        this.widgetElement.style.left = `${currentX}px`;
        this.widgetElement.style.right = 'auto';
        this.widgetElement.style.top = `${currentY}px`;
        this.widgetElement.style.bottom = 'auto';
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
        this.widgetElement.style.cursor = '';
      });
    }
    
    injectStyles() {
      if (document.getElementById('widget-styles')) return;
      
      const styles = `
        .widget-container {
          position: fixed;
          z-index: 10000;
          width: 360px;
          max-width: calc(100vw - 40px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: none;
          animation: widgetSlideIn 0.3s ease-out;
        }
        
        @keyframes widgetSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .widget-bottom-right {
          bottom: 20px;
          right: 20px;
        }
        
        .widget-bottom-left {
          bottom: 20px;
          left: 20px;
        }
        
        .widget-top-right {
          top: 20px;
          right: 20px;
        }
        
        .widget-top-left {
          top: 20px;
          left: 20px;
        }
        
        .widget-header {
          padding: 14px 18px;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          cursor: grab;
          user-select: none;
        }
        
        .widget-header:active {
          cursor: grabbing;
        }
        
        .widget-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .widget-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .widget-close:hover {
          opacity: 1;
        }
        
        .widget-content {
          padding: 12px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .widget-product {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .widget-product:hover {
          background-color: #f9fafb;
        }
        
        .widget-product:last-child {
          border-bottom: none;
        }
        
        .widget-product-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
        }
        
        .widget-product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .widget-product-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          line-height: 1.4;
        }
        
        .widget-product-price {
          font-size: 13px;
          color: #3B82F6;
          font-weight: 600;
        }
        
        .widget-product-link {
          font-size: 12px;
          color: #6b7280;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .widget-product-link:hover {
          color: #3B82F6;
          text-decoration: underline;
        }
        
        .widget-loader {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3B82F6;
          border-radius: 50%;
          animation: widgetSpin 1s linear infinite;
        }
        
        @keyframes widgetSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
          .widget-container {
            width: calc(100vw - 40px);
            bottom: 10px;
            right: 10px;
            left: 10px;
            margin: 0 auto;
          }
        }
      `;
      
      const styleSheet = document.createElement('style');
      styleSheet.id = 'widget-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
  
  // Export widget
  window.RecommendationWidget = RecommendationWidget;
  
  // Auto-initialize if config exists
  if (window.widgetConfig) {
    window.widgetInstance = new RecommendationWidget(window.widgetConfig);
    window.widgetInstance.init();
  }
  
  console.log('📦 Widget script loaded');
})();
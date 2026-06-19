(function () {
  let API_HOST = "https://carouselcraft.norexa.online";

  // Dynamically switch API_HOST in development to match the dynamic Cloudflare/Ngrok/Local tunnel URL
  if (document.currentScript && document.currentScript.src) {
    const scriptSrc = document.currentScript.src;
    if (
      scriptSrc.includes("trycloudflare.com") ||
      scriptSrc.includes("localhost") ||
      scriptSrc.includes("ngrok") ||
      scriptSrc.includes("shopifypreview.com")
    ) {
      try {
        const url = new URL(scriptSrc);
        API_HOST = url.origin;
        console.log("[CarouselCraft] Dev Mode: Using local API Host:", API_HOST);
      } catch (e) {
        console.error("[CarouselCraft] Failed to parse script origin:", e);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initCarousels);
  // Also run immediately in case DOMContentLoaded has already fired (e.g., in theme editor HMR)
  if (document.readyState === "interactive" || document.readyState === "complete") {
    initCarousels();
  }

  // Listen for Shopify Theme Editor events to re-initialize
  document.addEventListener("shopify:section:load", initCarousels);
  document.addEventListener("shopify:block:select", initCarousels);

  // Prevent all link redirects inside the Shopify Theme Editor (designMode) to avoid iframe crash/navigation
  document.addEventListener("click", (e) => {
    try {
      if (window.Shopify && window.Shopify.designMode && e.target && typeof e.target.closest === "function") {
        const embedLink = e.target.closest(".carousel-craft-embed a");
        if (embedLink) {
          e.preventDefault();
          e.stopPropagation();
          console.log("[CarouselCraft] Blocked navigation in Shopify designMode for link:", embedLink.href);
        }
      }
    } catch (err) {
      console.error("[CarouselCraft] Click interceptor error:", err);
    }
  }, true);

  // Set up MutationObserver to automatically initialize any newly inserted embeds
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      let shouldReinit = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList.contains("carousel-craft-embed") || node.querySelector(".carousel-craft-embed")) {
                shouldReinit = true;
                break;
              }
            }
          }
        }
        if (shouldReinit) break;
      }
      if (shouldReinit) {
        initCarousels();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }


  async function checkPlanAccess(shop, designNum) {
    try {
      const response = await fetch(`${API_HOST}/api/carousels?shop=${shop}&_t=${Date.now()}`);
      const plan = response.headers.get("X-Shop-Plan") || "free";
      
      const tmpl = [
        { id: 1, tier: "free", name: "Classic Slider" },
        { id: 2, tier: "pro", name: "Floating Cards" },
        { id: 3, tier: "pro", name: "Coverflow 3D" },
        { id: 4, tier: "elite", name: "Stacked Story" },
        { id: 5, tier: "elite", name: "Infinite Marquee" },
        { id: 6, tier: "elite", name: "3D Showcase" }
      ].find(t => t.id === designNum);

      if (!tmpl) return { allowed: true };
      
      const isAllowed = 
        (plan === "elite" || plan === "premium") ||
        (plan === "pro" && (tmpl.tier === "pro" || tmpl.tier === "free")) ||
        (tmpl.tier === "free");

      return { allowed: isAllowed, requiredTier: tmpl.tier, templateName: tmpl.name, currentPlan: plan };
    } catch (e) {
      console.error("[CarouselCraft] Plan check failed:", e);
      return { allowed: true };
    }
  }

  function renderPlanLock(container, templateName, requiredTier) {
    const shop = container.getAttribute("data-shop") || "";
    const upgradeUrl = shop ? `https://${shop}/admin/apps/carouselcraft` : "#";
    const tierName = requiredTier === "pro" ? "Pro" : "Elite";
    container.innerHTML = `
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; text-align: center; color: #1f2937; font-family: sans-serif; background: #ffffff; max-width: 480px; margin: 1.5rem auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        <div style="font-size: 24px; margin-bottom: 0.75rem;">🔒</div>
        <h3 style="margin: 0 0 0.25rem 0; font-weight: 700; font-size: 15px; color: #111827;">Template Locked</h3>
        <p style="margin: 0 0 1.25rem 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
          The <strong>${templateName}</strong> layout requires the <strong>${tierName}</strong> plan. Please upgrade your subscription inside the app dashboard to unlock this design.
        </p>
        <a href="${upgradeUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff; font-size: 12px; font-weight: 600; padding: 0.625rem 1.25rem; border-radius: 6px; text-decoration: none; transition: background 0.15s;">
          Upgrade Plan
        </a>
      </div>
    `;
  }

  async function initCarousels() {
    const embeds = document.querySelectorAll(".carousel-craft-embed:not([data-initialized])");
    for (const embed of embeds) {
      embed.setAttribute("data-initialized", "true");
      const shop = embed.getAttribute("data-shop");
      const name = embed.getAttribute("data-carousel-name");

      // Dynamically update API_HOST from container attributes (populated from shop metafields)
      const metaAppUrl = embed.getAttribute("data-app-url");
      if (metaAppUrl && metaAppUrl.trim()) {
        API_HOST = metaAppUrl.trim();
        console.log("[CarouselCraft] Using dynamic API Host from metafield:", API_HOST);
      }

      try {
        const slidesData = JSON.parse(embed.getAttribute("data-customizer-slides") || "[]");
        const settingsData = JSON.parse(embed.getAttribute("data-customizer-settings") || "{}");
        const designNum = parseInt(settingsData.design || 3, 10);

        // Prepare initial customizer data
        let carouselData = {
          id: "customizer-" + Date.now(),
          name: "Customizer Carousel",
          design: designNum,
          appearance: settingsData.appearance || {},
          layout: settingsData.layout || {},
          navigation: settingsData.navigation || {},
          slides: slidesData
        };

        // Render instantly with customizer settings/placeholders first
        renderCarousel(carouselData, embed);

        // If a database carousel lookup is requested, fetch and merge in the background
        if (name && name.trim()) {
          const fetchCarousel = (host) => {
            return fetch(`${host}/api/carousels?shop=${shop}&name=${encodeURIComponent(name.trim())}&_t=${Date.now()}`)
              .then(res => {
                if (!res.ok) throw new Error("Failed to fetch database carousel");
                return res.json();
              });
          };

          fetchCarousel(API_HOST)
            .catch(err => {
              console.warn("[CarouselCraft] Main API host failed, trying production fallback...", err);
              if (API_HOST !== "https://carouselcraft.norexa.online") {
                return fetchCarousel("https://carouselcraft.norexa.online");
              }
              throw err;
            })
            .then(carousels => {
              if (carousels && carousels.length > 0) {
                const dbCarousel = carousels[0];
                
                // Parse DB configurations
                const dbDesign = parseInt(dbCarousel.design, 10) || 3;
                const dbAppearance = typeof dbCarousel.appearance === "string" ? JSON.parse(dbCarousel.appearance) : dbCarousel.appearance || {};
                const dbLayout = typeof dbCarousel.layout === "string" ? JSON.parse(dbCarousel.layout) : dbCarousel.layout || {};
                const dbNavigation = typeof dbCarousel.navigation === "string" ? JSON.parse(dbCarousel.navigation) : dbCarousel.navigation || {};
                const dbSlides = dbCarousel.slides || [];

                // Smart Merge Slides: Customizer overrides specific fields if changed, otherwise database takes priority
                const mergedSlides = [];
                const maxSlides = Math.max(dbSlides.length, slidesData.length);
                for (let i = 0; i < maxSlides; i++) {
                  const customizerSlide = slidesData[i];
                  const dbSlide = dbSlides[i];
                  
                  if (dbSlide && customizerSlide) {
                    const hasCustomImage = customizerSlide.imageUrl && customizerSlide.imageUrl !== "";
                    
                    const isDefaultTitle = (i === 0 && customizerSlide.title === "Slide 1") || !customizerSlide.title;
                    const hasCustomTitle = !isDefaultTitle;

                    const isDefaultDesc = (i === 0 && customizerSlide.description === "Describe your product here.") || !customizerSlide.description;
                    const hasCustomDesc = !isDefaultDesc;

                    const isDefaultBtn = customizerSlide.buttonText === "Shop Now" || !customizerSlide.buttonText;
                    const hasCustomBtn = !isDefaultBtn;

                    const hasCustomLink = customizerSlide.linkUrl && customizerSlide.linkUrl !== "#" && customizerSlide.linkUrl !== "";

                    mergedSlides.push({
                      id: dbSlide.id || `merged-${i}`,
                      imageUrl: hasCustomImage ? customizerSlide.imageUrl : dbSlide.imageUrl,
                      title: hasCustomTitle ? customizerSlide.title : dbSlide.title,
                      description: hasCustomDesc ? customizerSlide.description : dbSlide.description,
                      buttonText: hasCustomBtn ? customizerSlide.buttonText : dbSlide.buttonText,
                      linkUrl: hasCustomLink ? customizerSlide.linkUrl : dbSlide.linkUrl
                    });
                  } else if (dbSlide) {
                    mergedSlides.push({
                      id: dbSlide.id || `db-${i}`,
                      imageUrl: dbSlide.imageUrl || "",
                      title: dbSlide.title || "",
                      description: dbSlide.description || "",
                      buttonText: dbSlide.buttonText || "",
                      linkUrl: dbSlide.linkUrl || "#"
                    });
                  } else if (customizerSlide) {
                    const isDefaultTitle = (i === 0 && customizerSlide.title === "Slide 1") || !customizerSlide.title;
                    if (customizerSlide.imageUrl || !isDefaultTitle) {
                      mergedSlides.push(customizerSlide);
                    }
                  }
                }

                // Merge settings (Customizer overrides database values)
                const mergedDesign = settingsData.design !== undefined ? parseInt(settingsData.design, 10) : dbDesign;
                const mergedAppearance = { ...dbAppearance, ...(settingsData.appearance || {}) };
                const mergedLayout = { ...dbLayout, ...(settingsData.layout || {}) };
                const mergedNavigation = { ...dbNavigation, ...(settingsData.navigation || {}) };

                const finalCarouselData = {
                  id: dbCarousel.id || carouselData.id,
                  name: dbCarousel.name || carouselData.name,
                  design: mergedDesign,
                  appearance: mergedAppearance,
                  layout: mergedLayout,
                  navigation: mergedNavigation,
                  slides: mergedSlides
                };

                // Re-render with merged data
                renderCarousel(finalCarouselData, embed);
              }
            })
            .catch(err => {
              console.warn("[CarouselCraft] Failed to merge database carousel:", err);
            });
        }

        // Verify plan access asynchronously in the background to prevent blocking UI rendering
        checkPlanAccess(shop, designNum).then((planCheck) => {
          if (planCheck && !planCheck.allowed) {
            renderPlanLock(embed, planCheck.templateName, planCheck.requiredTier);
          }
        }).catch((err) => {
          console.warn("[CarouselCraft] Deferred plan check failed:", err);
        });
      } catch (err) {
        console.error("[CarouselCraft] Failed to parse customizer data:", err);
        embed.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Error rendering Customizer carousel</div>`;
      }
    }
  }

  function renderCarousel(data, container) {
    const { design, appearance, layout, navigation, slides } = data;
    if (!slides || slides.length === 0) {
      container.innerHTML = `<p style="color: #9ca3af; font-size: 13px; text-align: center; font-family: sans-serif;">This carousel has no slides yet.</p>`;
      return;
    }

    // Set custom styles from configurations
    const font = appearance.fontFamily || "inherit";
    const bg = appearance.backgroundColor || "transparent";
    const textCol = appearance.textColor || "#000000";

    container.style.fontFamily = font;
    container.style.background = bg;
    container.style.color = textCol;
    container.style.borderRadius = "16px";
    container.style.padding = "1rem";
    container.style.overflow = "hidden";
    
    // Set --visible-cards variable dynamically for CSS responsive calculations
    const visibleCount = layout.visibleCards || 3;
    container.style.setProperty("--visible-cards", visibleCount);

    // Setup base HTML structures depending on designs
    let html = "";
    if (design === 5) {
      // Infinite Marquee
      html = renderMarquee(slides, appearance, layout, navigation);
    } else if (design === 4) {
      // Stacked Deck
      html = renderStacked(slides, appearance, layout, navigation);
    } else if (design === 3) {
      // Coverflow 3D
      html = renderCoverflow(slides, appearance, layout, navigation);
    } else if (design === 6) {
      // 3D Showcase Hero
      html = renderShowcase3D(slides, appearance, layout, navigation);
    } else {
      // Standard / Classic / Floating
      html = renderSlider(slides, design, appearance, layout, navigation);
    }

    container.innerHTML = html;

    // Attach event listeners and interactions
    if (design === 4) {
      setupStackedDeck(container, navigation);
    } else if (design === 3) {
      setupCoverflow(container, layout, navigation);
    } else if (design === 6) {
      setupShowcase3D(container, layout, navigation);
    } else {
      if (design === 2) {
        setupFloatingCards(container, layout);
      }
      if (design !== 5) {
        setupStandardSlider(container, design, navigation, layout);
      }
    }

    // Render the edit button overlay in Shopify customizer designMode
    if (window.Shopify && window.Shopify.designMode) {
      const shop = container.getAttribute("data-shop") || "";
      const carouselName = container.getAttribute("data-carousel-name") || "";
      
      // Only show slide editor if a lookup name is entered (so it merges/saves to DB)
      if (carouselName.trim()) {
        const editBtn = document.createElement("div");
        editBtn.className = "cc-storefront-edit-overlay";
        editBtn.innerHTML = `
          <button class="cc-storefront-edit-btn" style="position: absolute; top: 12px; right: 12px; z-index: 99999; background: #111827; color: #ffffff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s;">
            <span>⚙️</span> Edit slides list
          </button>
        `;
        
        // Ensure container is relative
        container.style.position = "relative";
        container.appendChild(editBtn);
        
        editBtn.querySelector("button").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openSlideEditorModal(shop, carouselName, slides, (updatedSlides) => {
            // Re-render carousel instantly in the customizer preview
            const updatedData = { ...data, slides: updatedSlides };
            renderCarousel(updatedData, container);
          });
        });
      }
    }
  }

  function openSlideEditorModal(shop, name, initialSlides, onSaveCallback) {
    // Check if modal already exists
    let modal = document.getElementById("cc-slide-editor-modal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.id = "cc-slide-editor-modal";
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999999;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Inter, system-ui, sans-serif;
      color: #1f2937;
    `;

    // Deep clone slides so we can revert if cancelled
    let localSlides = JSON.parse(JSON.stringify(initialSlides));
    let selectedIndex = localSlides.length > 0 ? 0 : null;

    const renderModalContent = () => {
      const slideListHtml = localSlides.map((s, idx) => `
        <div class="cc-editor-slide-row ${idx === selectedIndex ? 'active' : ''}" data-index="${idx}" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 6px; border: 1px solid ${idx === selectedIndex ? '#111827' : 'transparent'}; background: ${idx === selectedIndex ? '#f3f4f6' : 'transparent'};">
          <div style="width: 40px; height: 40px; border-radius: 6px; background: #e5e7eb; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #e5e7eb;">
            ${s.imageUrl ? `<img src="${s.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 16px; color: #9ca3af;">🖼️</span>`}
          </div>
          <div style="flex: 1; min-width: 0; text-align: left;">
            <div style="font-size: 13px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title || `Slide ${idx + 1}`}</div>
            <div style="font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.description || 'No description'}</div>
          </div>
          <button class="cc-editor-delete-slide-btn" data-index="${idx}" style="background: none; border: none; font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #9ca3af; transition: color 0.15s;" title="Delete slide">🗑️</button>
        </div>
      `).join("");

      const formHtml = selectedIndex !== null && localSlides[selectedIndex] ? `
        <div style="display: flex; flex-direction: column; gap: 12px; height: 100%;">
          <div style="font-size: 14px; font-weight: 700; border-b: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 4px; text-align: left;">Edit Slide Details</div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <label style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; tracking-wider;">Image URL</label>
            <input type="text" id="cc-edit-imageUrl" value="${localSlides[selectedIndex].imageUrl || ''}" style="width: 100%; font-size: 13px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <label style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; tracking-wider;">Title</label>
            <input type="text" id="cc-edit-title" value="${localSlides[selectedIndex].title || ''}" style="width: 100%; font-size: 13px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <label style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; tracking-wider;">Description</label>
            <textarea id="cc-edit-description" rows="3" style="width: 100%; font-size: 13px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; resize: none;">${localSlides[selectedIndex].description || ''}</textarea>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <label style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; tracking-wider;">Button Text</label>
            <input type="text" id="cc-edit-buttonText" value="${localSlides[selectedIndex].buttonText || ''}" style="width: 100%; font-size: 13px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;" />
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
            <label style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; tracking-wider;">Redirect URL</label>
            <input type="text" id="cc-edit-linkUrl" value="${localSlides[selectedIndex].linkUrl || ''}" style="width: 100%; font-size: 13px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;" />
          </div>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 13px; min-height: 250px;">
          <span>👈 Select a slide to edit or add a new slide</span>
        </div>
      `;

      modal.innerHTML = `
        <div style="background: #ffffff; border-radius: 16px; width: 90%; max-width: 800px; height: 80vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
          <!-- Modal Header -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <div style="text-align: left;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #111827;">Edit Slides: ${name}</h3>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Changes will sync directly to the app dashboard database.</p>
            </div>
            <button class="cc-modal-close-btn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #9ca3af; transition: color 0.15s;">&times;</button>
          </div>

          <!-- Modal Body -->
          <div style="flex: 1; display: flex; overflow: hidden;">
            <!-- Left Side: Slide list -->
            <div style="width: 300px; border-right: 1px solid #f3f4f6; display: flex; flex-direction: column; height: 100%;">
              <div style="flex: 1; overflow-y: auto; padding: 16px;" class="cc-modal-slides-list-container">
                ${slideListHtml}
              </div>
              <div style="padding: 12px 16px; border-top: 1px solid #f3f4f6; flex-shrink: 0;">
                <button class="cc-editor-add-slide-btn" style="width: 100%; background: #ffffff; border: 1px dashed #d1d5db; color: #374151; font-size: 13px; font-weight: 600; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;">
                  <span>➕</span> Add New Slide
                </button>
              </div>
            </div>

            <!-- Right Side: Edit Form -->
            <div style="flex: 1; overflow-y: auto; padding: 20px;" class="cc-modal-form-container">
              ${formHtml}
            </div>
          </div>

          <!-- Modal Footer -->
          <div style="padding: 16px 20px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-shrink: 0; background: #fafafa;">
            <button class="cc-modal-cancel-btn" style="background: #ffffff; border: 1px solid #d1d5db; color: #374151; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: background 0.15s;">Cancel</button>
            <button class="cc-modal-save-btn" style="background: #111827; border: none; color: #ffffff; font-size: 13px; font-weight: 600; padding: 8px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.15s;">
              <span>💾</span> Save to Database
            </button>
          </div>
        </div>
      `;

      attachEventListeners();
    };

    const attachEventListeners = () => {
      // Close button
      modal.querySelector(".cc-modal-close-btn").addEventListener("click", () => modal.remove());
      modal.querySelector(".cc-modal-cancel-btn").addEventListener("click", () => modal.remove());

      // Slide list items click
      modal.querySelectorAll(".cc-editor-slide-row").forEach(row => {
        row.addEventListener("click", (e) => {
          if (e.target.classList.contains("cc-editor-delete-slide-btn")) return;
          saveFormState();
          selectedIndex = parseInt(row.getAttribute("data-index"));
          renderModalContent();
        });
      });

      // Delete slide button
      modal.querySelectorAll(".cc-editor-delete-slide-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute("data-index"));
          if (confirm(`Delete slide "${localSlides[idx].title || `Slide ${idx + 1}`}"?`)) {
            localSlides.splice(idx, 1);
            if (selectedIndex >= localSlides.length) {
              selectedIndex = localSlides.length > 0 ? localSlides.length - 1 : null;
            }
            renderModalContent();
          }
        });
      });

      // Add slide button
      modal.querySelector(".cc-editor-add-slide-btn").addEventListener("click", () => {
        saveFormState();
        localSlides.push({
          title: "New Slide",
          description: "Describe your product here.",
          buttonText: "Shop Now",
          linkUrl: "#",
          imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b46a0eb?w=800&q=80"
        });
        selectedIndex = localSlides.length - 1;
        renderModalContent();
      });

      // Save button (sync to DB)
      modal.querySelector(".cc-modal-save-btn").addEventListener("click", async () => {
        saveFormState();
        const saveBtn = modal.querySelector(".cc-modal-save-btn");
        saveBtn.disabled = true;
        saveBtn.style.opacity = "0.7";
        saveBtn.innerText = "Saving...";

        const saveSlides = async (host) => {
          const res = await fetch(`${host}/api/carousels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shop,
              name,
              slides: localSlides
            })
          });

          if (!res.ok) {
            const errBody = await res.json();
            throw new Error(errBody.error || "Failed to save slides");
          }
          return res;
        };

        try {
          let res;
          try {
            res = await saveSlides(API_HOST);
          } catch (firstErr) {
            console.warn("[CarouselCraft] Main API host failed on save, trying production fallback...", firstErr);
            if (API_HOST !== "https://carouselcraft.norexa.online") {
              res = await saveSlides("https://carouselcraft.norexa.online");
            } else {
              throw firstErr;
            }
          }

          if (typeof onSaveCallback === "function") {
            onSaveCallback(localSlides);
          }

          modal.remove();
          console.log("[CarouselCraft] Database slides updated successfully!");
        } catch (err) {
          alert(`Error saving: ${err.message}`);
          saveBtn.disabled = false;
          saveBtn.style.opacity = "1";
          saveBtn.innerHTML = `<span>💾</span> Save to Database`;
        }
      });
    };

    const saveFormState = () => {
      if (selectedIndex === null || !localSlides[selectedIndex]) return;
      const img = modal.querySelector("#cc-edit-imageUrl");
      const title = modal.querySelector("#cc-edit-title");
      const desc = modal.querySelector("#cc-edit-description");
      const btn = modal.querySelector("#cc-edit-buttonText");
      const link = modal.querySelector("#cc-edit-linkUrl");

      if (img) localSlides[selectedIndex].imageUrl = img.value;
      if (title) localSlides[selectedIndex].title = title.value;
      if (desc) localSlides[selectedIndex].description = desc.value;
      if (btn) localSlides[selectedIndex].buttonText = btn.value;
      if (link) localSlides[selectedIndex].linkUrl = link.value;
    };

    document.body.appendChild(modal);
    renderModalContent();
  }

  // --- Renderers ---
  function renderSlider(slides, design, appearance, layout, navigation) {
    const cardShapeClass = layout.cardShape === "rounded" ? "rounded-2xl" : layout.cardShape === "circle" ? "rounded-full" : "rounded-none";
    const visibleCount = layout.visibleCards || 3;
    const buttonStyle = navigation.buttonStyle || "solid";

    const FLOATING_ACCENTS_GRADIENT = [
      "linear-gradient(to right, #a78bfa, #6366f1)",
      "linear-gradient(to right, #fb7185, #ec4899)",
      "linear-gradient(to right, #fbbf24, #f97316)",
      "linear-gradient(to right, #2dd4bf, #06b6d4)",
      "linear-gradient(to right, #34d399, #22c55e)"
    ];

    let slidesHtml = slides.map((slide, index) => {
      let cardStyle = "";
      let rotationAttr = "";
      if (design === 2) {
        // Floating cards initial offsets
        const rotations = ["-1deg", "1deg", "-0.5deg", "1.5deg"];
        const rot = rotations[index % rotations.length];
        rotationAttr = `data-rotation="${rot}"`;
      }

      if (layout.cardWidth) {
        cardStyle += ` width: ${layout.cardWidth}px; min-width: ${layout.cardWidth}px; max-width: 100%;`;
      }

      if (design === 2) {
        const accent = FLOATING_ACCENTS_GRADIENT[index % FLOATING_ACCENTS_GRADIENT.length];
        const borderRadiusVal = appearance.borderRadius || 20;

        return `
          <div class="cc-slide flex-shrink-0 bg-white transition-all duration-300 overflow-hidden flex flex-col justify-between" 
               ${rotationAttr} 
               style="${cardStyle} border-radius: ${borderRadiusVal}px; box-shadow: 0 8px 32px -8px rgba(0,0,0,0.12);">
            <div class="cc-accent-bar" style="background: ${accent};"></div>
            <div class="p-5 flex flex-col justify-between flex-1">
              <div>
                <a href="${slide.linkUrl || '#'}" class="block aspect-[4/5] w-full overflow-hidden bg-gray-50 mb-4 relative" style="border-radius: ${Math.max(0, borderRadiusVal - 4)}px;">
                  ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">No Image</div>`}
                  <div class="cc-number-badge">${String(index + 1).padStart(2, "0")}</div>
                </a>
                <h3 class="font-bold text-gray-900 text-lg mb-1.5 line-clamp-1">${slide.title || 'Untitled'}</h3>
                <p class="text-gray-500 text-sm line-clamp-3 leading-relaxed mb-4">${slide.description || ''}</p>
              </div>
              ${slide.buttonText ? `
                <a href="${slide.linkUrl || '#'}" class="cc-btn text-center block w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90" style="background: ${accent}; color: #ffffff !important;">
                  ${slide.buttonText}
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }

      return `
        <div class="cc-slide flex-shrink-0 bg-white border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 ${cardShapeClass} p-5 flex flex-col justify-between" ${rotationAttr} style="${cardStyle}">
          <div>
            <a href="${slide.linkUrl || '#'}" class="block aspect-[4/5] w-full overflow-hidden ${cardShapeClass === 'rounded-full' ? 'rounded-full' : 'rounded-lg'} bg-gray-50 mb-4">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">No Image</div>`}
            </a>
            <h3 class="font-bold text-gray-900 text-lg mb-1 line-clamp-1">${slide.title || 'Untitled'}</h3>
            <p class="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-4">${slide.description || ''}</p>
          </div>
          ${slide.buttonText ? `
            <a href="${slide.linkUrl || '#'}" class="cc-btn text-center block w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
              buttonStyle === 'outline' ? 'border border-gray-900 text-gray-900 hover:bg-gray-50' : 
              buttonStyle === 'glass' ? 'bg-gray-100/80 backdrop-blur text-gray-900 hover:bg-gray-200/80' : 
              'bg-gray-900 text-white hover:bg-black'
            }">
              ${slide.buttonText}
            </a>
          ` : ''}
        </div>
      `;
    }).join("");

    return `
      <div class="cc-slider-wrapper relative group/slider">
        <div class="cc-slides flex overflow-x-auto gap-4 scroll-smooth pb-4 px-2" style="scroll-snap-type: x mandatory;">
          ${slidesHtml}
        </div>
        ${navigation.arrows !== false ? `
          <button class="cc-arrow cc-prev" aria-label="Previous">❮</button>
          <button class="cc-arrow cc-next" aria-label="Next">❯</button>
        ` : ""}
        ${navigation.dots !== false ? `
          <div class="cc-dots">
            ${slides.map((_, i) => `<button class="cc-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderMarquee(slides, appearance, layout, navigation) {
    const cardWidth = layout.cardWidth || 280;
    const speed = layout.marqueeSpeed === "fast" ? "12s" : layout.marqueeSpeed === "slow" ? "32s" : "20s";
    const borderRadius = appearance.borderRadius || 16;

    // Duplicate slides to ensure seamless loop
    const doubledSlides = [...slides, ...slides, ...slides, ...slides];

    let itemsHtml = doubledSlides.map((slide) => `
      <div class="cc-marquee-item flex-shrink-0 bg-white border border-gray-100 p-4 shadow-sm mx-3 relative group" style="width: ${cardWidth}px; border-radius: ${borderRadius}px; overflow: hidden; height: 380px;">
        <a href="${slide.linkUrl || '#'}" class="block w-full h-full overflow-hidden bg-gray-50 relative" style="border-radius: ${borderRadius - 4}px;">
          ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover transition-all duration-500" loading="lazy" />` : ""}
          <!-- Hover reveal overlay -->
          <div class="cc-marquee-overlay absolute inset-0 flex flex-col justify-end p-5 opacity-0 transition-opacity duration-300" 
               style="background: linear-gradient(to top, rgba(0,0,0,0.68) 0%, transparent 55%);">
            <h3 class="text-white font-bold text-base leading-tight mb-2" style="color: #ffffff !important; margin: 0 0 0.25rem 0;">${slide.title || 'Brand'}</h3>
            ${slide.description ? `<p class="text-white text-xs line-clamp-1 mb-3" style="color: rgba(255,255,255,0.8) !important; margin: 0 0 0.5rem 0;">${slide.description}</p>` : ''}
            ${slide.buttonText ? `
              <span class="mt-2 inline-block border border-white text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white hover:text-gray-900 transition-all cc-btn w-fit" style="border: 1px solid #ffffff; color: #ffffff !important; border-radius: 9999px; padding: 0.375rem 1rem;">
                ${slide.buttonText}
              </span>
            ` : ''}
          </div>
        </a>
      </div>
    `).join("");

    return `
      <div class="cc-marquee-container overflow-hidden py-4">
        <div class="cc-marquee-track flex" style="animation: cc-marquee ${speed} linear infinite;">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  function renderStacked(slides, appearance, layout, navigation) {
    const borderRadius = appearance.borderRadius || 24;

    let cardsHtml = slides.map((slide, index) => {
      // Calculate stack order (top card is index 0)
      const zIndex = slides.length - index;
      const transform = `translateY(${index * 12}px) scale(${1 - index * 0.04})`;
      const opacity = index > 2 ? 0 : 1;

      const cardHeight = layout.height ? layout.height - 40 : 480;

      return `
        <div class="cc-stacked-card absolute w-full max-w-sm bg-white shadow-lg flex flex-col justify-between transition-all duration-300" 
             style="z-index: ${zIndex}; transform: ${transform}; opacity: ${opacity}; border-radius: ${borderRadius}px; height: ${cardHeight}px; overflow: hidden;" 
             data-index="${index}">
          <!-- Full-bleed image -->
          <div class="relative w-full h-full bg-gray-100">
            <a href="${slide.linkUrl || '#'}" class="cc-stacked-link block w-full h-full" style="pointer-events: ${index === 0 ? 'auto' : 'none'};">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center text-gray-300">No Image</div>`}
            </a>
            
            <!-- Bottom gradient overlay -->
            <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.0) 48%); z-index: 1;"></div>
            
            <!-- Content overlay -->
            <div class="absolute bottom-0 left-0 right-0 p-6" style="z-index: 2;">
              <h3 class="text-white font-bold text-xl leading-snug mb-1" style="color: #ffffff !important; margin: 0 0 0.25rem 0;">${slide.title || 'Untitled'}</h3>
              <p class="text-white text-sm line-clamp-2" style="color: rgba(255,255,255,0.7) !important; margin: 0 0 1rem 0;">${slide.description || ''}</p>
              ${slide.buttonText ? `
                <a href="${slide.linkUrl || '#'}" class="mt-3 inline-block bg-white text-gray-900 font-bold text-sm px-5 py-2 rounded-full hover:bg-gray-100 transition-all cc-btn" style="background-color: #ffffff; color: #111827 !important; border-radius: 9999px; width: fit-content; padding: 0.5rem 1.25rem;">
                  ${slide.buttonText}
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="cc-stacked-container relative flex justify-center items-center w-full max-w-sm mx-auto overflow-hidden cursor-pointer" style="height: ${layout.height || 520}px;">
        ${cardsHtml}
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full pointer-events-none" style="z-index: 10;">
          Click Card to Cycle
        </div>
      </div>
    `;
  }

  function renderShowcase3D(slides, appearance, layout, navigation) {
    const layoutSide = layout.layoutSide || "left";
    const borderRadius = appearance.borderRadius || 24;
    const buttonStyle = navigation.buttonStyle || "solid";

    const textOrder = layoutSide === "right" ? "order-2" : "order-1";
    const imageOrder = layoutSide === "right" ? "order-1" : "order-2";

    let slidesHtml = slides.map((slide, index) => {
      const btnClass = 
        buttonStyle === 'outline' ? 'border-2 border-gray-900 text-gray-900 bg-transparent hover:bg-gray-900 hover:text-white' : 
        buttonStyle === 'glass' ? 'bg-white/20 border border-white/30 text-white hover:bg-white/30' : 
        'bg-gray-900 text-white hover:bg-black';

      return `
        <div class="cc-3d-slide-item absolute inset-0 flex flex-col md:flex-row items-center gap-12 transition-all duration-500" 
             style="opacity: ${index === 0 ? '1' : '0'}; pointer-events: ${index === 0 ? 'auto' : 'none'};" 
             data-index="${index}">
          <!-- Text side -->
          <div class="flex-1 ${textOrder}">
            <div class="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
              ${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}
            </div>
            <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4" style="margin: 0 0 1rem 0;">
              ${slide.title || 'Untitled'}
            </h2>
            <p class="text-gray-500 text-base md:text-lg leading-relaxed mb-6">${slide.description || ''}</p>
            ${slide.buttonText ? `
              <a href="${slide.linkUrl || '#'}" class="cc-btn inline-block px-8 py-3.5 rounded-xl font-bold text-sm transition-all ${btnClass}" style="width: fit-content;">
                ${slide.buttonText}
              </a>
            ` : ''}
            
            <!-- Navigation -->
            <div class="flex gap-3 mt-8">
              <button class="cc-3d-prev w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white cursor-pointer" aria-label="Previous">❮</button>
              <button class="cc-3d-next w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center text-white hover:bg-black transition-colors cursor-pointer" aria-label="Next">❯</button>
            </div>
          </div>

          <!-- Image side with tilt container -->
          <div class="flex-1 relative ${imageOrder} w-full">
            <div class="absolute -inset-8 rounded-full pointer-events-none opacity-30" 
                 style="background: radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.10) 50%, transparent 75%); filter: blur(32px); z-index: 0;">
            </div>
            <div class="cc-3d-tilt-card relative z-10 mx-auto" style="perspective: 1000px; max-width: 400px; width: 100%;">
              <a href="${slide.linkUrl || '#'}" class="cc-3d-link block aspect-[4/5] w-full bg-gray-100 overflow-hidden shadow-xl" style="border-radius: ${borderRadius}px; transform-style: preserve-3d; transition: transform 0.1s ease-out; pointer-events: ${index === 0 ? 'auto' : 'none'};">
                ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" draggable="false" />` : `<div class="w-full h-full flex items-center justify-center text-gray-300">No Image</div>`}
              </a>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="cc-3d-showcase-wrapper relative w-full overflow-hidden" style="min-height: ${layout.height || 560}px; padding: 2rem 0;">
        ${slidesHtml}
      </div>
    `;
  }

  function setupShowcase3D(container, layout, navigation) {
    const wrapper = container.querySelector(".cc-3d-showcase-wrapper");
    if (!wrapper) return;
    const slides = Array.from(wrapper.querySelectorAll(".cc-3d-slide-item"));
    if (slides.length === 0) return;

    let currentIndex = 0;
    const tiltStrength = layout.tiltStrength || 12;

    const update = () => {
      slides.forEach((slide, index) => {
        const link = slide.querySelector(".cc-3d-link");
        if (index === currentIndex) {
          slide.style.opacity = "1";
          slide.style.pointerEvents = "auto";
          if (link) link.style.pointerEvents = "auto";
        } else {
          slide.style.opacity = "0";
          slide.style.pointerEvents = "none";
          if (link) link.style.pointerEvents = "none";
        }
      });
    };

    slides.forEach((slide, index) => {
      const prevBtn = slide.querySelector(".cc-3d-prev");
      const nextBtn = slide.querySelector(".cc-3d-next");
      const tiltCard = slide.querySelector(".cc-3d-tilt-card div");

      if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex - 1 + slides.length) % slides.length;
          update();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex + 1) % slides.length;
          update();
        });
      }

      if (tiltCard) {
        slide.addEventListener("mousemove", (e) => {
          const rect = tiltCard.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) / (rect.width / 2);
          const dy = (e.clientY - cy) / (rect.height / 2);
          const rotY = dx * tiltStrength;
          const rotX = -dy * tiltStrength;
          tiltCard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
        });

        slide.addEventListener("mouseleave", () => {
          tiltCard.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
        });
      }
    });

    // Autoplay logic
    if (navigation && navigation.autoplay) {
      const interval = parseInt(navigation.autoplaySpeed || "4000", 10);
      let autoplayTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        update();
      }, interval);

      container.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
      container.addEventListener("mouseleave", () => {
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(() => {
          currentIndex = (currentIndex + 1) % slides.length;
          update();
        }, interval);
      });
    }
  }

  // --- Handlers & Functionality ---
  function setupStandardSlider(container, design, navigation, layout) {
    const slidesContainer = container.querySelector(".cc-slides");
    const dots = container.querySelectorAll(".cc-dot");
    const prevBtn = container.querySelector(".cc-prev");
    const nextBtn = container.querySelector(".cc-next");
    if (!slidesContainer) return;

    // Handle slide navigation arrows
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener("click", () => {
        const cardWidth = slidesContainer.firstElementChild?.offsetWidth || 300;
        slidesContainer.scrollBy({ left: -cardWidth, behavior: "smooth" });
      });
      nextBtn.addEventListener("click", () => {
        const cardWidth = slidesContainer.firstElementChild?.offsetWidth || 300;
        slidesContainer.scrollBy({ left: cardWidth, behavior: "smooth" });
      });
    }

    // Handle dots mapping
    if (dots.length > 0) {
      dots.forEach((dot) => {
        dot.addEventListener("click", () => {
          const index = parseInt(dot.getAttribute("data-index"));
          const cards = slidesContainer.querySelectorAll(".cc-slide");
          if (cards[index]) {
            slidesContainer.scrollTo({
              left: cards[index].offsetLeft - slidesContainer.offsetLeft,
              behavior: "smooth"
            });
          }
        });
      });

      // Synchronize dots on scroll
      slidesContainer.addEventListener("scroll", () => {
        const cards = slidesContainer.querySelectorAll(".cc-slide");
        let activeIndex = 0;
        let minDiff = Infinity;
        cards.forEach((card, i) => {
          const diff = Math.abs(card.getBoundingClientRect().left - slidesContainer.getBoundingClientRect().left);
          if (diff < minDiff) {
            minDiff = diff;
            activeIndex = i;
          }
        });
        dots.forEach((dot, i) => {
          if (i === activeIndex) dot.classList.add("active");
          else dot.classList.remove("active");
        });
      });
    }

    // Coverflow 3D effect / Tilt Showcase 3D effect updates on scroll/hover
    if (design === 3) {
      const updateCoverflow = () => {
        const cards = slidesContainer.querySelectorAll(".cc-slide");
        const containerCenter = slidesContainer.getBoundingClientRect().left + slidesContainer.offsetWidth / 2;
        cards.forEach((card) => {
          const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
          const offset = cardCenter - containerCenter;
          const absOffset = Math.abs(offset);
          
          if (absOffset < card.offsetWidth) {
            const scale = 1 - (absOffset / card.offsetWidth) * 0.15;
            const rotation = (offset / card.offsetWidth) * -20;
            card.style.transform = `scale(${scale}) rotateY(${rotation}deg)`;
            card.style.opacity = "1";
            card.style.zIndex = "10";
          } else {
            card.style.transform = `scale(0.85) rotateY(${offset > 0 ? -20 : 20}deg)`;
            card.style.opacity = "0.7";
            card.style.zIndex = "1";
          }
        });
      };
      slidesContainer.addEventListener("scroll", updateCoverflow);
      setTimeout(updateCoverflow, 100);
    } else if (design === 6) {
      // 3D Showcase tilt interaction
      const cards = slidesContainer.querySelectorAll(".cc-slide");
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          const rotX = (y / (rect.height / 2)) * -12;
          const rotY = (x / (rect.width / 2)) * 12;
          card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
        });
        card.style.transition = "transform 0.1s ease-out";
        card.addEventListener("mouseleave", () => {
          card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
        });
      });
    }

    // Autoplay implementation
    if (navigation.autoplay) {
      const interval = parseInt(navigation.autoplaySpeed || "4000");
      let autoPlayTimer = setInterval(() => {
        const maxScroll = slidesContainer.scrollWidth - slidesContainer.clientWidth;
        if (slidesContainer.scrollLeft >= maxScroll - 5) {
          slidesContainer.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          const cardWidth = slidesContainer.firstElementChild?.offsetWidth || 300;
          slidesContainer.scrollBy({ left: cardWidth, behavior: "smooth" });
        }
      }, interval);

      // Pause autoplay on interaction
      container.addEventListener("mouseenter", () => clearInterval(autoPlayTimer));
    }
  }

  function setupStackedDeck(container, navigation) {
    const deck = container.querySelector(".cc-stacked-container");
    if (!deck) return;

    const cycleNext = () => {
      const cards = Array.from(deck.querySelectorAll(".cc-stacked-card"));
      if (cards.length <= 1) return;

      const topCard = cards.find(c => c.style.transform.includes("scale(1)"));
      if (!topCard) return;

      // Animate top card flying out and going to back
      topCard.style.transition = "transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease";
      topCard.style.transform = "translateX(120%) rotate(10deg) scale(0.9)";
      topCard.style.opacity = "0";

      setTimeout(() => {
        // Move the top card data attributes and translate to the bottom of the stack
        cards.forEach((card) => {
          let idx = parseInt(card.getAttribute("data-index"));
          let newIdx = idx - 1;
          if (newIdx < 0) {
            newIdx = cards.length - 1; // Send to back
          }
          
          card.setAttribute("data-index", newIdx);
          card.style.zIndex = cards.length - newIdx;
          card.style.transform = `translateY(${newIdx * 12}px) scale(${1 - newIdx * 0.04})`;
          card.style.opacity = newIdx > 2 ? "0" : "1";

          const link = card.querySelector(".cc-stacked-link");
          if (link) {
            link.style.pointerEvents = newIdx === 0 ? "auto" : "none";
          }
        });
        
        setTimeout(() => {
          topCard.style.transition = "transform 0.3s ease, opacity 0.3s ease";
        }, 50);
      }, 250);
    };

    deck.addEventListener("click", (e) => {
      if (e.target.closest("a") || e.target.closest("button") || e.target.classList.contains("cc-btn")) {
        return; // Let redirect/clicks happen
      }
      cycleNext();
    });

    // Autoplay logic
    if (navigation && navigation.autoplay) {
      const interval = parseInt(navigation.autoplaySpeed || "4000", 10);
      let autoplayTimer = setInterval(cycleNext, interval);

      container.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
      container.addEventListener("mouseleave", () => {
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(cycleNext, interval);
      });
    }

    // Touch Swipe Gesture Support
    let startY = 0;
    let startX = 0;
    let isDragging = false;

    deck.addEventListener("touchstart", (e) => {
      if (e.target.closest("a") || e.target.closest("button") || e.target.classList.contains("cc-btn")) {
        return;
      }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    deck.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const diffY = e.touches[0].clientY - startY;
      const diffX = e.touches[0].clientX - startX;
      // Trigger card swipe cycle if vertical or horizontal swipe threshold is met
      if (Math.abs(diffY) > 80 || Math.abs(diffX) > 80) {
        isDragging = false;
        cycleNext();
      }
    }, { passive: true });

    deck.addEventListener("touchend", () => {
      isDragging = false;
    });
  }

  function setupFloatingCards(container, layout) {
    const cards = container.querySelectorAll(".cc-slide");
    const yOffset = layout.yOffset || -14;
    
    cards.forEach((card) => {
      const rot = card.getAttribute("data-rotation") || "0deg";
      
      // Set initial state
      card.style.transform = `rotate(${rot})`;
      
      card.addEventListener("mouseenter", () => {
        card.style.transform = `translateY(${yOffset}px) scale(1.03) rotate(${rot})`;
        card.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
      });
      
      card.addEventListener("mouseleave", () => {
        card.style.transform = `rotate(${rot})`;
        card.style.boxShadow = "0 8px 32px -8px rgba(0,0,0,0.12)";
      });
    });
  }

  function renderCoverflow(slides, appearance, layout, navigation) {
    const cardWidth = layout.cardWidth || 300;
    const borderRadius = appearance.borderRadius || 16;
    const showReflection = layout.showReflection !== false;

    const cardHeight = layout.height ? layout.height - 140 : 360;
    const topOffset = layout.height ? (layout.height - 80 - cardHeight) / 2 : 30;

    let slidesHtml = slides.map((slide, index) => {
      let reflectionHtml = "";
      if (showReflection) {
        reflectionHtml = `
          <div class="cc-coverflow-reflection absolute left-0 right-0 overflow-hidden pointer-events-none" 
               style="top: 100%; height: 80px; border-radius: 0 0 ${borderRadius}px ${borderRadius}px; transform: scaleY(-1); opacity: ${index === 0 ? '0.18' : '0'}; mask-image: linear-gradient(to bottom, black 0%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%); z-index: 5; transition: opacity 0.4s ease;">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" style="width: 100%; height: ${cardHeight}px; object-fit: cover; object-position: top; display: block;" />` : ''}
          </div>
        `;
      }

      return `
        <div class="cc-coverflow-card absolute cursor-pointer" 
             style="width: ${cardWidth}px; left: calc(50% - ${cardWidth / 2}px); top: ${topOffset}px; transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease, filter 0.4s ease;" 
             data-index="${index}">
          <div class="shadow-lg" style="border-radius: ${borderRadius}px; height: ${cardHeight}px; position: relative; overflow: hidden; background-color: #111827;">
            <a href="${slide.linkUrl || '#'}" class="cc-coverflow-link block w-full h-full" style="pointer-events: ${index === 0 ? 'auto' : 'none'};">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" style="width: 100%; height: 100%; object-fit: cover; display: block;" draggable="false" />` : `<div class="w-full h-full flex items-center justify-center text-gray-600 text-sm">No Image</div>`}
            </a>
            <div class="cc-coverflow-info" style="position: absolute; left: 0; right: 0; bottom: 0; padding: 1.25rem; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 65%); z-index: 10; display: flex; flex-direction: column; justify-content: flex-end; opacity: ${index === 0 ? '1' : '0'}; pointer-events: ${index === 0 ? 'auto' : 'none'}; transition: opacity 0.3s ease;">
              <h3 class="text-white font-bold text-lg leading-tight mb-1" style="color: #ffffff; margin-bottom: 4px; font-weight: 700; font-size: 1.125rem;">${slide.title || 'Untitled'}</h3>
              ${slide.buttonText ? `<a href="${slide.linkUrl || '#'}" class="mt-2 inline-block bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors w-fit cc-btn" style="background-color: #ffffff; color: #111827; display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.5rem; text-decoration: none; width: fit-content; text-align: center;">${slide.buttonText}</a>` : ''}
            </div>
          </div>
          ${reflectionHtml}
        </div>
      `;
    }).join("");

    return `
      <div class="cc-coverflow-wrapper relative flex flex-col items-center justify-center py-8" style="min-height: ${layout.height || 500}px; width: 100%;">
        <div class="cc-coverflow-stage relative w-full flex items-center justify-center overflow-hidden" style="height: ${layout.height ? layout.height - 80 : 420}px; perspective: 1200px;">
          ${slidesHtml}
        </div>
        <div class="flex items-center gap-5 mt-6 z-20">
          ${navigation.arrows !== false ? `
            <button class="cc-coverflow-arrow cc-coverflow-prev bg-white/10 hover:bg-white/20 border border-white/20 text-white p-3 rounded-full transition-all cursor-pointer" aria-label="Previous">❮</button>
          ` : ""}
          ${navigation.dots !== false ? `
            <div class="cc-coverflow-dots flex gap-2">
              ${slides.map((_, i) => `<button class="cc-coverflow-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join("")}
            </div>
          ` : ""}
          ${navigation.arrows !== false ? `
            <button class="cc-coverflow-arrow cc-coverflow-next bg-white/10 hover:bg-white/20 border border-white/20 text-white p-3 rounded-full transition-all cursor-pointer" aria-label="Next">❯</button>
          ` : ""}
        </div>
      </div>
    `;
  }

  function setupCoverflow(container, layout, navigation) {
    const stage = container.querySelector(".cc-coverflow-stage");
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll(".cc-coverflow-card"));
    const dots = container.querySelectorAll(".cc-coverflow-dot");
    const prevBtn = container.querySelector(".cc-coverflow-prev");
    const nextBtn = container.querySelector(".cc-coverflow-next");

    let currentIndex = 0;
    const rotationAngle = layout.rotationAngle ?? 42;
    const centerScale = layout.centerScale ?? 1.12;
    const depthSpacing = layout.depthSpacing ?? 200;

    const update = () => {
      cards.forEach((card, idx) => {
        const offset = idx - currentIndex;
        const absOffset = Math.abs(offset);
        const isVisible = absOffset <= 2;
        
        if (!isVisible) {
          card.style.display = "none";
          return;
        }
        
        card.style.display = "block";
        const isActive = offset === 0;
        const xPos = offset * depthSpacing;
        const rotateY = offset * -rotationAngle;
        const scale = isActive ? centerScale : Math.max(0.72, 1 - absOffset * 0.14);
        const zIndex = 10 - absOffset;
        const opacity = absOffset >= 2 ? 0.25 : isActive ? 1 : 0.55;
        const brightness = isActive ? 1 : Math.max(0.5, 1 - absOffset * 0.25);
        
        card.style.transform = `translateX(${xPos}px) rotateY(${rotateY}deg) scale(${scale})`;
        card.style.zIndex = zIndex;
        card.style.opacity = opacity;
        card.style.filter = `brightness(${brightness})`;

        const info = card.querySelector(".cc-coverflow-info");
        if (info) {
          info.style.opacity = isActive ? "1" : "0";
          info.style.pointerEvents = isActive ? "auto" : "none";
        }

        const link = card.querySelector(".cc-coverflow-link");
        if (link) {
          link.style.pointerEvents = isActive ? "auto" : "none";
        }

        const reflection = card.querySelector(".cc-coverflow-reflection");
        if (reflection) {
          reflection.style.opacity = isActive ? "0.18" : "0";
        }
      });

      // Update dots
      dots.forEach((dot, i) => {
        if (i === currentIndex) dot.classList.add("active");
        else dot.classList.remove("active");
      });
    };

    // Prevent default browser image dragging inside stage
    stage.addEventListener("dragstart", (e) => {
      e.preventDefault();
    });

    // Attach click listeners to cards
    cards.forEach((card, idx) => {
      card.addEventListener("click", (e) => {
        if (idx !== currentIndex) {
          e.preventDefault();
          e.stopPropagation();
          currentIndex = idx;
          update();
        }
      });
    });

    // Arrow controls
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + cards.length) % cards.length;
        update();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % cards.length;
        update();
      });
    }

    // Dot controls
    dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        currentIndex = parseInt(dot.getAttribute("data-index"));
        update();
      });
    });

    // Gestures (Touch Swipe + Mouse Drag)
    let startX = 0;
    let isDragging = false;

    const handleStart = (clientX) => {
      startX = clientX;
      isDragging = true;
    };

    const handleMove = (clientX) => {
      if (!isDragging) return;
      const diffX = clientX - startX;
      if (Math.abs(diffX) > 60) {
        isDragging = false;
        if (diffX > 0) {
          currentIndex = (currentIndex - 1 + cards.length) % cards.length;
        } else {
          currentIndex = (currentIndex + 1) % cards.length;
        }
        update();
      }
    };

    const handleEnd = () => {
      isDragging = false;
    };

    stage.addEventListener("touchstart", (e) => {
      handleStart(e.touches[0].clientX);
    }, { passive: true });

    stage.addEventListener("touchmove", (e) => {
      handleMove(e.touches[0].clientX);
    }, { passive: true });

    stage.addEventListener("touchend", handleEnd);

    // Mouse drag interaction
    stage.addEventListener("mousedown", (e) => {
      handleStart(e.clientX);

      const onMouseMove = (moveEvent) => {
        handleMove(moveEvent.clientX);
      };

      const onMouseUp = () => {
        handleEnd();
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    // Autoplay logic
    if (navigation.autoplay) {
      const speed = parseInt(navigation.autoplaySpeed || navigation.speed || "3500", 10);
      let autoplayTimer;
      const startAutoplay = () => {
        autoplayTimer = setInterval(() => {
          currentIndex = (currentIndex + 1) % cards.length;
          update();
        }, speed);
      };
      startAutoplay();
      container.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
      container.addEventListener("mouseleave", () => startAutoplay());
    }

    update();
  }
})();

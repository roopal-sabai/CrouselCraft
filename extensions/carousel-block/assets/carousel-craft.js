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
      const source = embed.getAttribute("data-carousel-source") || "database";
      const name = embed.getAttribute("data-carousel-name");

      if (source === "customizer") {
        try {
          const slidesData = JSON.parse(embed.getAttribute("data-customizer-slides") || "[]");
          const settingsData = JSON.parse(embed.getAttribute("data-customizer-settings") || "{}");
          
          if (slidesData.length === 0) {
            embed.innerHTML = `
              <div style="border: 2px dashed #e5e7eb; border-radius: 12px; padding: 2rem; text-align: center; color: #6b7280; font-family: sans-serif; background: #f9fafb;">
                <p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 14px;">No Slides Added Yet</p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Click "Add slide" inside the Theme Customizer sidebar to add your first slide.</p>
              </div>
            `;
            continue;
          }

          const designNum = parseInt(settingsData.design || 3, 10);
          
          // Verify plan access asynchronously
          const planCheck = await checkPlanAccess(shop, designNum);
          if (!planCheck.allowed) {
            renderPlanLock(embed, planCheck.templateName, planCheck.requiredTier);
            continue;
          }

          const carouselData = {
            id: "customizer-" + Date.now(),
            name: "Customizer Carousel",
            design: designNum,
            appearance: settingsData.appearance || {},
            layout: settingsData.layout || {},
            navigation: settingsData.navigation || {},
            slides: slidesData
          };

          renderCarousel(carouselData, embed);
        } catch (err) {
          console.error("[CarouselCraft] Failed to parse customizer data:", err);
          embed.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Error rendering Customizer carousel</div>`;
        }
      } else {
        if (shop) {
          await discoverAndSelectCarousel(shop, name, embed);
        } else {
          embed.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Shop domain missing</div>`;
        }
      }
    }
  }

  async function discoverAndSelectCarousel(shop, name, container) {
    if (!name || !name.trim()) {
      container.innerHTML = `
        <div style="border: 1px dashed #d1d5db; border-radius: 12px; padding: 2rem; text-align: center; color: #4b5563; font-family: sans-serif; background: #f9fafb; max-width: 500px; margin: 1.5rem auto;">
          <p style="margin: 0 0 0.25rem 0; font-weight: 700; font-size: 14px; color: #111827;">App Database Source Selected</p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Enter the name of your carousel in the <strong>Lookup Carousel by Name</strong> field to display your database slides.</p>
        </div>
      `;
      return;
    }

    try {
      const response = await fetch(`${API_HOST}/api/carousels?shop=${shop}&name=${encodeURIComponent(name || "")}&_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch carousels list");
      const carousels = await response.json();
      const plan = response.headers.get("X-Shop-Plan") || "free";

      if (!carousels || carousels.length === 0) {
        container.innerHTML = `
          <div style="border: 1px dashed #d1d5db; border-radius: 12px; padding: 2rem; text-align: center; color: #4b5563; font-family: sans-serif; background: #f9fafb; max-width: 500px; margin: 1.5rem auto;">
            <p style="margin: 0 0 0.25rem 0; font-weight: 700; font-size: 14px; color: #111827;">Carousel Not Found</p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">No active database carousel named "<strong>${name}</strong>" was found. Please check the spelling or publish it in your CarouselCraft dashboard.</p>
          </div>
        `;
        return;
      }

      const selectedCarousel = carousels[0];
      if (selectedCarousel) {
        selectedCarousel.design = parseInt(selectedCarousel.design, 10);
      }

      // Smart Merge: override database settings with Customizer settings
      try {
        const customizerSettings = JSON.parse(container.getAttribute("data-customizer-settings") || "{}");
        if (customizerSettings && Object.keys(customizerSettings).length > 0) {
          if (customizerSettings.design !== undefined) {
            selectedCarousel.design = parseInt(customizerSettings.design, 10);
          }
          if (customizerSettings.appearance) {
            selectedCarousel.appearance = {
              ...(selectedCarousel.appearance || {}),
              ...customizerSettings.appearance
            };
          }
          if (customizerSettings.layout) {
            selectedCarousel.layout = {
              ...(selectedCarousel.layout || {}),
              ...customizerSettings.layout
            };
          }
          if (customizerSettings.navigation) {
            selectedCarousel.navigation = {
              ...(selectedCarousel.navigation || {}),
              ...customizerSettings.navigation
            };
          }
        }
      } catch (err) {
        console.error("[CarouselCraft] Failed to apply Customizer overrides to database carousel:", err);
      }



      // Enforce plan check for database source
      const tmpl = [
        { id: 1, tier: "free", name: "Classic Slider" },
        { id: 2, tier: "pro", name: "Floating Cards" },
        { id: 3, tier: "pro", name: "Coverflow 3D" },
        { id: 4, tier: "elite", name: "Stacked Story" },
        { id: 5, tier: "elite", name: "Infinite Marquee" },
        { id: 6, tier: "elite", name: "3D Showcase" }
      ].find(t => t.id === selectedCarousel.design);

      const isAllowed = !tmpl || 
        (plan === "elite" || plan === "premium") ||
        (plan === "pro" && (tmpl.tier === "pro" || tmpl.tier === "free")) ||
        (tmpl.tier === "free");

      if (!isAllowed) {
        renderPlanLock(container, tmpl.name, tmpl.tier);
        return;
      }

      renderCarousel(selectedCarousel, container);
    } catch (error) {
      console.error("[CarouselCraft Discovery Error]", error);
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Failed to load carousel showcase</div>`;
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
      setupStackedDeck(container);
    } else if (design === 3) {
      setupCoverflow(container, layout, navigation);
    } else if (design === 6) {
      setupShowcase3D(container, layout);
    } else {
      if (design === 2) {
        setupFloatingCards(container, layout);
      }
      if (design !== 5) {
        setupStandardSlider(container, design, navigation, layout);
      }
    }
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
                <div class="aspect-[4/5] w-full overflow-hidden bg-gray-50 mb-4 relative" style="border-radius: ${Math.max(0, borderRadiusVal - 4)}px;">
                  ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">No Image</div>`}
                  <div class="cc-number-badge">${String(index + 1).padStart(2, "0")}</div>
                </div>
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
            <div class="aspect-[4/5] w-full overflow-hidden ${cardShapeClass === 'rounded-full' ? 'rounded-full' : 'rounded-lg'} bg-gray-50 mb-4">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">No Image</div>`}
            </div>
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
        <div class="w-full h-full overflow-hidden bg-gray-50 relative" style="border-radius: ${borderRadius - 4}px;">
          ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover transition-all duration-500" loading="lazy" />` : ""}
          <!-- Hover reveal overlay -->
          <div class="cc-marquee-overlay absolute inset-0 flex flex-col justify-end p-5 opacity-0 transition-opacity duration-300" 
               style="background: linear-gradient(to top, rgba(0,0,0,0.68) 0%, transparent 55%);">
            <h3 class="text-white font-bold text-base leading-tight mb-2" style="color: #ffffff !important; margin: 0 0 0.25rem 0;">${slide.title || 'Brand'}</h3>
            ${slide.description ? `<p class="text-white text-xs line-clamp-1 mb-3" style="color: rgba(255,255,255,0.8) !important; margin: 0 0 0.5rem 0;">${slide.description}</p>` : ''}
            ${slide.buttonText ? `
              <a href="${slide.linkUrl || '#'}" class="mt-2 inline-block border border-white text-white text-xs font-semibold px-4 py-1.5 rounded-full hover:bg-white hover:text-gray-900 transition-all cc-btn w-fit" style="border: 1px solid #ffffff; color: #ffffff !important; border-radius: 9999px; padding: 0.375rem 1rem;">
                ${slide.buttonText}
              </a>
            ` : ''}
          </div>
        </div>
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

      return `
        <div class="cc-stacked-card absolute w-full max-w-sm bg-white shadow-lg flex flex-col justify-between transition-all duration-300" 
             style="z-index: ${zIndex}; transform: ${transform}; opacity: ${opacity}; border-radius: ${borderRadius}px; height: 480px; overflow: hidden;" 
             data-index="${index}">
          <!-- Full-bleed image -->
          <div class="relative w-full h-full bg-gray-100">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center text-gray-300">No Image</div>`}
            
            <!-- Bottom gradient overlay -->
            <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.0) 48%); z-index: 1;"></div>
            
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
      <div class="cc-stacked-container relative flex justify-center items-center h-[520px] w-full max-w-sm mx-auto overflow-hidden cursor-pointer">
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
              <div class="aspect-[4/5] w-full bg-gray-100 overflow-hidden shadow-xl" style="border-radius: ${borderRadius}px; transform-style: preserve-3d; transition: transform 0.1s ease-out;">
                ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" draggable="false" />` : `<div class="w-full h-full flex items-center justify-center text-gray-300">No Image</div>`}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="cc-3d-showcase-wrapper relative w-full overflow-hidden" style="min-height: 560px; padding: 2rem 0;">
        ${slidesHtml}
      </div>
    `;
  }

  function setupShowcase3D(container, layout) {
    const wrapper = container.querySelector(".cc-3d-showcase-wrapper");
    if (!wrapper) return;
    const slides = Array.from(wrapper.querySelectorAll(".cc-3d-slide-item"));
    if (slides.length === 0) return;

    let currentIndex = 0;
    const tiltStrength = layout.tiltStrength || 12;

    const update = () => {
      slides.forEach((slide, index) => {
        if (index === currentIndex) {
          slide.style.opacity = "1";
          slide.style.pointerEvents = "auto";
        } else {
          slide.style.opacity = "0";
          slide.style.pointerEvents = "none";
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

  function setupStackedDeck(container) {
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

    let slidesHtml = slides.map((slide, index) => {
      let reflectionHtml = "";
      if (showReflection) {
        reflectionHtml = `
          <div class="cc-coverflow-reflection absolute left-0 right-0 overflow-hidden pointer-events-none" 
               style="top: 100%; height: 80px; border-radius: 0 0 ${borderRadius}px ${borderRadius}px; transform: scaleY(-1); opacity: ${index === 0 ? '0.18' : '0'}; mask-image: linear-gradient(to bottom, black 0%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%); z-index: 5; transition: opacity 0.4s ease;">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" style="width: 100%; height: 360px; object-fit: cover; object-position: top; display: block;" />` : ''}
          </div>
        `;
      }

      return `
        <div class="cc-coverflow-card absolute cursor-pointer" 
             style="width: ${cardWidth}px; left: calc(50% - ${cardWidth / 2}px); top: calc(50% - 180px); transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease, filter 0.4s ease;" 
             data-index="${index}">
          <div class="shadow-lg" style="border-radius: ${borderRadius}px; height: 360px; position: relative; overflow: hidden; background-color: #111827;">
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" style="width: 100%; height: 100%; object-fit: cover; display: block;" draggable="false" />` : `<div class="w-full h-full flex items-center justify-center text-gray-600 text-sm">No Image</div>`}
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
      <div class="cc-coverflow-wrapper relative flex flex-col items-center justify-center py-8" style="min-height: 500px; width: 100%;">
        <div class="cc-coverflow-stage relative w-full flex items-center justify-center overflow-hidden" style="height: 420px; perspective: 1200px;">
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
      const speed = parseInt(navigation.speed || "3500", 10);
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

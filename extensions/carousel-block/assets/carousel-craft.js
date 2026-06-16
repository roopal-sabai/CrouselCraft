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
  // or handle updates to the data-carousel-id attribute in the theme editor
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
        } else if (mutation.type === "attributes" && mutation.attributeName === "data-carousel-id") {
          // If data-carousel-id changed (e.g. user pasted a new ID), re-initialize it
          mutation.target.removeAttribute("data-initialized");
          shouldReinit = true;
        }
        if (shouldReinit) break;
      }
      if (shouldReinit) {
        initCarousels();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-carousel-id"]
    });
  }


  async function initCarousels() {
    const embeds = document.querySelectorAll(".carousel-craft-embed:not([data-initialized])");
    for (const embed of embeds) {
      embed.setAttribute("data-initialized", "true");
      const carouselId = embed.getAttribute("data-carousel-id")?.trim();
      const shop = embed.getAttribute("data-shop");

      if (!carouselId) {
        if (shop) {
          await discoverAndSelectCarousel(shop, embed);
        } else {
          embed.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Carousel ID missing</div>`;
        }
      } else {
        await fetchCarousel(carouselId, shop, embed);
      }
    }
  }

  async function discoverAndSelectCarousel(shop, container) {
    try {
      const response = await fetch(`${API_HOST}/api/carousels?shop=${shop}&_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch carousels list");
      const carousels = await response.json();

      if (!carousels || carousels.length === 0) {
        container.innerHTML = `
          <div style="border: 2px dashed #e5e7eb; border-radius: 12px; padding: 2rem; text-align: center; color: #6b7280; font-family: sans-serif; background: #f9fafb;">
            <p style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 14px;">No Carousels Found</p>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Open the CarouselCraft App to create your first catalog showcase.</p>
          </div>
        `;
        return;
      }

      const selectedCarousel = carousels[0];
      renderCarousel(selectedCarousel, container);

      if (window.Shopify && window.Shopify.designMode) {
        renderCarouselPicker(carousels, selectedCarousel.id, shop, container);
      }
    } catch (error) {
      console.error("[CarouselCraft Discovery Error]", error);
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Failed to load carousel showcase</div>`;
    }
  }

  async function fetchCarousel(id, shop, container) {
    try {
      const response = await fetch(`${API_HOST}/api/carousel/${id}?_t=${Date.now()}`);
      if (response.status === 404 && shop) {
        console.warn(`[CarouselCraft] Carousel ID ${id} not found. Running auto-discovery fallback.`);
        await discoverAndSelectCarousel(shop, container);
        return;
      }
      if (!response.ok) throw new Error("Failed to load carousel data");
      const data = await response.json();
      renderCarousel(data, container);

      if (window.Shopify && window.Shopify.designMode && shop) {
        try {
          const listResponse = await fetch(`${API_HOST}/api/carousels?shop=${shop}&_t=${Date.now()}`);
          if (listResponse.ok) {
            const carousels = await listResponse.json();
            renderCarouselPicker(carousels, id, shop, container);
          }
        } catch (e) {
          console.error("[CarouselCraft Picker Load Error]", e);
        }
      }
    } catch (error) {
      console.error("[CarouselCraft Fetch Error]", error);
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-family: sans-serif; font-size: 13px;">Failed to load carousel showcase</div>`;
    }
  }

  function renderCarouselPicker(carousels, selectedId, shop, container) {
    const existingPicker = container.querySelector(".cc-theme-picker-header");
    if (existingPicker) existingPicker.remove();

    const header = document.createElement("div");
    header.className = "cc-theme-picker-header";
    header.style.cssText = "background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-family: sans-serif; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); text-align: left;";

    let optionsHtml = carousels.map(c => 
      `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name} (${c.slides.length} slides)</option>`
    ).join("");

    header.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase;">Carousel Selection Helper (Theme Editor Only)</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <select class="cc-picker-select" style="flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 12px; background: white; color: #1f2937; cursor: pointer;">
          ${optionsHtml}
        </select>
        <button class="cc-picker-copy-btn" style="background: white; border: 1px solid #d1d5db; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: #374151; white-space: nowrap;">Copy ID</button>
      </div>
      <div style="font-size: 10px; color: #6b7280; line-height: 1.4;">
        To save this choice permanently, copy the Carousel ID and paste it into the **Carousel ID** input field in the sidebar.
      </div>
    `;

    const select = header.querySelector(".cc-picker-select");
    select.addEventListener("change", async (e) => {
      const newId = e.target.value;
      const selected = carousels.find(c => c.id === newId);
      if (selected) {
        renderCarousel(selected, container);
        renderCarouselPicker(carousels, newId, shop, container);
      }
    });

    const copyBtn = header.querySelector(".cc-picker-copy-btn");
    copyBtn.addEventListener("click", () => {
      const currentVal = select.value;
      navigator.clipboard.writeText(currentVal);
      alert("Carousel ID copied! Please paste it into the Carousel ID field in the theme settings sidebar.");
    });

    container.insertBefore(header, container.firstChild);
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
    } else {
      // Standard / Classic / Floating / Coverflow / 3D
      html = renderSlider(slides, design, appearance, layout, navigation);
    }

    container.innerHTML = html;

    // Attach event listeners and interactions
    if (design === 4) {
      setupStackedDeck(container);
    } else if (design !== 5) {
      setupStandardSlider(container, design, navigation, layout);
    }
  }

  // --- Renderers ---
  function renderSlider(slides, design, appearance, layout, navigation) {
    const cardShapeClass = layout.cardShape === "rounded" ? "rounded-2xl" : layout.cardShape === "circle" ? "rounded-full" : "rounded-none";
    const visibleCount = layout.visibleCards || 3;
    const buttonStyle = navigation.buttonStyle || "solid";

    let slidesHtml = slides.map((slide, index) => {
      let cardStyle = "";
      if (design === 2) {
        // Floating cards initial offsets
        const rotations = ["-1deg", "1deg", "-0.5deg", "1.5deg"];
        const rot = rotations[index % rotations.length];
        cardStyle = `transform: rotate(${rot});`;
      }

      if (layout.cardWidth) {
        cardStyle += ` width: ${layout.cardWidth}px; min-width: ${layout.cardWidth}px; max-width: 100%;`;
      }

      return `
        <div class="cc-slide flex-shrink-0 bg-white border border-gray-100 shadow-sm transition-all duration-300 ${cardShapeClass} p-4 flex flex-col justify-between" style="${cardStyle}">
          <div>
            <div class="aspect-[4/5] w-full overflow-hidden ${cardShapeClass === 'rounded-full' ? 'rounded-full' : 'rounded-lg'} bg-gray-50 mb-4">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title || ''}" class="w-full h-full object-cover" loading="lazy" />` : `<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">No Image</div>`}
            </div>
            <h3 class="font-bold text-gray-900 text-base mb-1">${slide.title || 'Untitled'}</h3>
            <p class="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4">${slide.description || ''}</p>
          </div>
          ${slide.buttonText ? `
            <a href="${slide.linkUrl || '#'}" class="cc-btn text-center block w-full py-2 px-4 rounded-lg font-bold text-xs transition-all ${
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
    const speed = layout.marqueeSpeed === "fast" ? "12s" : layout.marqueeSpeed === "slow" ? "32s" : "20s";
    const cardShapeClass = layout.cardShape === "rounded" ? "rounded-xl" : "rounded-none";

    // Duplicate slides to ensure seamless loop
    const doubledSlides = [...slides, ...slides, ...slides];

    let itemsHtml = doubledSlides.map((slide) => `
      <div class="cc-marquee-item flex-shrink-0 w-44 bg-white border border-gray-100 p-3 shadow-xs ${cardShapeClass} mx-2">
        <div class="aspect-square w-full overflow-hidden ${cardShapeClass} bg-gray-50 mb-2">
          ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" loading="lazy" />` : ""}
        </div>
        <p class="font-bold text-gray-900 text-xs truncate text-center">${slide.title || 'Brand'}</p>
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
    const cardShapeClass = layout.cardShape === "rounded" ? "rounded-3xl" : "rounded-none";
    const buttonStyle = navigation.buttonStyle || "solid";

    let cardsHtml = slides.map((slide, index) => {
      // Calculate stack order (top card is index 0)
      const zIndex = slides.length - index;
      const transform = `translateY(${index * 12}px) scale(${1 - index * 0.04})`;
      const opacity = index > 2 ? 0 : 1;

      return `
        <div class="cc-stacked-card absolute w-full max-w-sm bg-white border border-gray-100 shadow-lg p-5 flex flex-col justify-between transition-all duration-300 ${cardShapeClass}" 
             style="z-index: ${zIndex}; transform: ${transform}; opacity: ${opacity};" 
             data-index="${index}">
          <div>
            <div class="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-50 mb-4">
              ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="" class="w-full h-full object-cover" loading="lazy" />` : ""}
            </div>
            <h3 class="font-extrabold text-gray-900 text-lg mb-1">${slide.title || 'Untitled'}</h3>
            <p class="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-4">${slide.description || ''}</p>
          </div>
          ${slide.buttonText ? `
            <a href="${slide.linkUrl || '#'}" class="cc-btn text-center block w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
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
      <div class="cc-stacked-container relative flex justify-center items-center h-[520px] w-full max-w-sm mx-auto overflow-hidden cursor-pointer">
        ${cardsHtml}
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full pointer-events-none">
          Click Card to Cycle
        </div>
      </div>
    `;
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

    deck.addEventListener("click", () => {
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
    });
  }
})();

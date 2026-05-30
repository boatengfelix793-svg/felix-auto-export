(function () {
  "use strict";

  const STORAGE = {
    inventory: "felixBInventory",
    inventoryVersion: "felixBInventoryVersion",
    quotes: "felixBQuotes",
    contacts: "felixBContacts",
    settings: "felixBSettings",
    settingsVersion: "felixBSettingsVersion"
  };

  const APP_CONFIG = window.FELIX_B_CONFIG || {};
  const CONFIG_VERSION = APP_CONFIG.version || "local-config";
  const CONFIG_INVENTORY = Array.isArray(APP_CONFIG.vehicles) ? APP_CONFIG.vehicles : [];
  const DEFAULT_SETTINGS = {
    whatsappNumber: APP_CONFIG.business && APP_CONFIG.business.whatsappNumber ? APP_CONFIG.business.whatsappNumber : "",
    email: APP_CONFIG.business && APP_CONFIG.business.email ? APP_CONFIG.business.email : "sales@felixbautoexport.com"
  };

  const HERO_IMAGE = "assets/hero-auto-export.png";

  let inventory = readVersionedStorage(STORAGE.inventory, STORAGE.inventoryVersion, CONFIG_INVENTORY);
  let quotes = readStorage(STORAGE.quotes, []);
  let contacts = readStorage(STORAGE.contacts, []);
  let settings = Object.assign({}, DEFAULT_SETTINGS, readVersionedStorage(STORAGE.settings, STORAGE.settingsVersion, DEFAULT_SETTINGS));

  const els = {
    inventoryGrid: document.querySelector("#inventoryGrid"),
    inventoryEmpty: document.querySelector("#inventoryEmpty"),
    inventoryTable: document.querySelector("#inventoryTable"),
    quoteTable: document.querySelector("#quoteTable"),
    quoteEmpty: document.querySelector("#quoteEmpty"),
    search: document.querySelector("#inventorySearch"),
    bodyFilter: document.querySelector("#bodyFilter"),
    statusFilter: document.querySelector("#statusFilter"),
    maxPriceFilter: document.querySelector("#maxPriceFilter"),
    sortFilter: document.querySelector("#sortFilter"),
    vehicleForm: document.querySelector("#vehicleForm"),
    vehicleId: document.querySelector("#vehicleId"),
    vehicleYear: document.querySelector("#vehicleYear"),
    vehicleBody: document.querySelector("#vehicleBody"),
    vehicleMake: document.querySelector("#vehicleMake"),
    vehicleModel: document.querySelector("#vehicleModel"),
    vehiclePrice: document.querySelector("#vehiclePrice"),
    vehicleMileage: document.querySelector("#vehicleMileage"),
    vehicleStatus: document.querySelector("#vehicleStatus"),
    vehicleLocation: document.querySelector("#vehicleLocation"),
    vehicleImage: document.querySelector("#vehicleImage"),
    vehicleNotes: document.querySelector("#vehicleNotes"),
    saveVehicle: document.querySelector("#saveVehicle"),
    cancelEdit: document.querySelector("#cancelEdit"),
    exportInventory: document.querySelector("#exportInventory"),
    restoreConfig: document.querySelector("#restoreConfig"),
    metricTotal: document.querySelector("#metricTotal"),
    metricAvailable: document.querySelector("#metricAvailable"),
    metricQuotes: document.querySelector("#metricQuotes"),
    settingsForm: document.querySelector("#settingsForm"),
    settingWhatsApp: document.querySelector("#settingWhatsApp"),
    settingEmail: document.querySelector("#settingEmail"),
    quoteDialog: document.querySelector("#quoteDialog"),
    quoteForm: document.querySelector("#quoteForm"),
    quoteVehicle: document.querySelector("#quoteVehicle"),
    quoteName: document.querySelector("#quoteName"),
    quoteContact: document.querySelector("#quoteContact"),
    quoteCountry: document.querySelector("#quoteCountry"),
    quotePort: document.querySelector("#quotePort"),
    quoteBudget: document.querySelector("#quoteBudget"),
    quoteTimeline: document.querySelector("#quoteTimeline"),
    quoteNotes: document.querySelector("#quoteNotes"),
    quoteStatus: document.querySelector("#quoteStatus"),
    closeQuote: document.querySelector("#closeQuote"),
    contactForm: document.querySelector("#contactForm"),
    contactName: document.querySelector("#contactName"),
    contactMethod: document.querySelector("#contactMethod"),
    contactTopic: document.querySelector("#contactTopic"),
    contactMessage: document.querySelector("#contactMessage"),
    contactChannel: document.querySelector("#contactChannel"),
    contactStatus: document.querySelector("#contactStatus"),
    currentYear: document.querySelector("#currentYear"),
    emailLink: document.querySelector("#emailLink")
  };

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  init();

  function init() {
    els.currentYear.textContent = new Date().getFullYear();
    syncSettingsFields();
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    [els.search, els.bodyFilter, els.statusFilter, els.maxPriceFilter, els.sortFilter].forEach((control) => {
      control.addEventListener("input", renderInventoryCards);
      control.addEventListener("change", renderInventoryCards);
    });

    document.querySelectorAll(".js-open-quote").forEach((button) => {
      button.addEventListener("click", () => openQuoteDialog());
    });

    document.querySelectorAll(".js-whatsapp-general").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const message = [
          "Hello Felix B Auto Export,",
          "I would like help with a vehicle export quote.",
          "Please send available inventory and next steps."
        ].join("\n");
        openExternal(buildWhatsAppUrl(message));
      });
    });

    els.vehicleForm.addEventListener("submit", handleVehicleSubmit);
    els.cancelEdit.addEventListener("click", resetVehicleForm);
    els.exportInventory.addEventListener("click", exportInventory);
    els.restoreConfig.addEventListener("click", restoreConfigInventory);
    els.settingsForm.addEventListener("submit", handleSettingsSubmit);
    els.quoteForm.addEventListener("submit", handleQuoteSubmit);
    els.closeQuote.addEventListener("click", closeQuoteDialog);
    els.quoteDialog.addEventListener("click", (event) => {
      if (event.target === els.quoteDialog) closeQuoteDialog();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.quoteDialog.hidden) closeQuoteDialog();
    });
    els.contactForm.addEventListener("submit", handleContactSubmit);
  }

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : clone(fallback);
    } catch (error) {
      console.warn("Storage read failed", key, error);
      return clone(fallback);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readVersionedStorage(key, versionKey, fallback) {
    try {
      const storedVersion = window.localStorage.getItem(versionKey);
      if (storedVersion !== CONFIG_VERSION) {
        writeRawStorage(versionKey, CONFIG_VERSION);
        return clone(fallback);
      }
      return readStorage(key, fallback);
    } catch (error) {
      console.warn("Versioned storage read failed", key, error);
      return clone(fallback);
    }
  }

  function writeStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function writeRawStorage(key, value) {
    window.localStorage.setItem(key, value);
  }

  function renderAll() {
    renderInventoryCards();
    renderInventoryTable();
    renderQuoteTable();
    renderMetrics();
    syncSettingsLinks();
    populateQuoteVehicleOptions();
  }

  function filteredInventory() {
    const query = els.search.value.trim().toLowerCase();
    const body = els.bodyFilter.value;
    const status = els.statusFilter.value;
    const maxPrice = Number(els.maxPriceFilter.value || 0);
    const list = inventory.filter((vehicle) => {
      const searchable = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.body} ${vehicle.location}`.toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (!body || vehicle.body === body) &&
        (!status || vehicle.status === status) &&
        (!maxPrice || Number(vehicle.price) <= maxPrice)
      );
    });

    const sort = els.sortFilter.value;
    return list.sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      if (sort === "year-desc") return Number(b.year) - Number(a.year);
      if (sort === "mileage-asc") return Number(a.mileage) - Number(b.mileage);
      return inventory.indexOf(a) - inventory.indexOf(b);
    });
  }

  function renderInventoryCards() {
    const list = filteredInventory();
    els.inventoryGrid.innerHTML = "";
    els.inventoryEmpty.hidden = list.length > 0;

    list.forEach((vehicle) => {
      const article = document.createElement("article");
      article.className = "vehicle-card";
      article.innerHTML = `
        <div class="vehicle-media">
          <img src="${escapeAttribute(vehicle.image || HERO_IMAGE)}" alt="${escapeAttribute(vehicle.year + " " + vehicle.make + " " + vehicle.model)}">
          <span class="vehicle-badge">${escapeHtml(vehicle.status)}</span>
        </div>
        <div class="vehicle-body">
          <h3>${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</h3>
          <div class="vehicle-meta">
            <span>${escapeHtml(vehicle.body)}</span>
            <span>${formatMiles(vehicle.mileage)} mi</span>
            <span>${escapeHtml(vehicle.location)}</span>
          </div>
          <div class="vehicle-price">${currency.format(Number(vehicle.price || 0))}</div>
          <p class="vehicle-notes">${escapeHtml(vehicle.notes || "Export details available on request.")}</p>
          <div class="vehicle-actions">
            <button class="btn btn-primary" type="button" data-quote="${escapeAttribute(vehicle.id)}">Quote</button>
            <button class="btn btn-outline" type="button" data-whatsapp="${escapeAttribute(vehicle.id)}">WhatsApp</button>
          </div>
        </div>
      `;
      els.inventoryGrid.appendChild(article);
    });

    els.inventoryGrid.querySelectorAll("[data-quote]").forEach((button) => {
      button.addEventListener("click", () => openQuoteDialog(button.dataset.quote));
    });

    els.inventoryGrid.querySelectorAll("[data-whatsapp]").forEach((button) => {
      button.addEventListener("click", () => {
        const vehicle = findVehicle(button.dataset.whatsapp);
        const message = buildVehicleMessage(vehicle);
        openExternal(buildWhatsAppUrl(message));
      });
    });
  }

  function renderInventoryTable() {
    els.inventoryTable.innerHTML = "";
    inventory.forEach((vehicle) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</strong><br>${escapeHtml(vehicle.body)}</td>
        <td><span class="status-pill">${escapeHtml(vehicle.status)}</span></td>
        <td>${currency.format(Number(vehicle.price || 0))}</td>
        <td>${formatMiles(vehicle.mileage)} mi</td>
        <td>${escapeHtml(vehicle.location)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline" type="button" data-edit="${escapeAttribute(vehicle.id)}">Edit</button>
            <button class="btn btn-secondary" type="button" data-table-quote="${escapeAttribute(vehicle.id)}">Quote</button>
            <button class="btn btn-outline" type="button" data-remove="${escapeAttribute(vehicle.id)}">Remove</button>
          </div>
        </td>
      `;
      els.inventoryTable.appendChild(row);
    });

    els.inventoryTable.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => editVehicle(button.dataset.edit));
    });

    els.inventoryTable.querySelectorAll("[data-table-quote]").forEach((button) => {
      button.addEventListener("click", () => openQuoteDialog(button.dataset.tableQuote));
    });

    els.inventoryTable.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => removeVehicle(button.dataset.remove));
    });
  }

  function renderQuoteTable() {
    els.quoteTable.innerHTML = "";
    els.quoteEmpty.hidden = quotes.length > 0;

    quotes.forEach((quote) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(quote.name)}</strong><br>${escapeHtml(quote.contact)}</td>
        <td>${escapeHtml(quote.vehicleLabel)}</td>
        <td>${escapeHtml(quote.country)}${quote.port ? "<br>" + escapeHtml(quote.port) : ""}</td>
        <td><span class="status-pill">${escapeHtml(quote.status)}</span></td>
        <td>${escapeHtml(new Date(quote.createdAt).toLocaleDateString())}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary" type="button" data-quote-whatsapp="${escapeAttribute(quote.id)}">WhatsApp</button>
            <button class="btn btn-outline" type="button" data-quote-status="${escapeAttribute(quote.id)}">${quote.status === "Contacted" ? "Reopen" : "Contacted"}</button>
            <button class="btn btn-outline" type="button" data-quote-delete="${escapeAttribute(quote.id)}">Delete</button>
          </div>
        </td>
      `;
      els.quoteTable.appendChild(row);
    });

    els.quoteTable.querySelectorAll("[data-quote-whatsapp]").forEach((button) => {
      button.addEventListener("click", () => {
        const quote = quotes.find((item) => item.id === button.dataset.quoteWhatsapp);
        if (quote) openExternal(buildWhatsAppUrl(buildQuoteMessage(quote)));
      });
    });

    els.quoteTable.querySelectorAll("[data-quote-status]").forEach((button) => {
      button.addEventListener("click", () => toggleQuoteStatus(button.dataset.quoteStatus));
    });

    els.quoteTable.querySelectorAll("[data-quote-delete]").forEach((button) => {
      button.addEventListener("click", () => deleteQuote(button.dataset.quoteDelete));
    });
  }

  function renderMetrics() {
    els.metricTotal.textContent = inventory.length;
    els.metricAvailable.textContent = inventory.filter((vehicle) => vehicle.status === "Available").length;
    els.metricQuotes.textContent = quotes.length;
  }

  function populateQuoteVehicleOptions(selectedId) {
    const selected = selectedId || els.quoteVehicle.value || "";
    els.quoteVehicle.innerHTML = '<option value="">General sourcing request</option>';
    inventory.forEach((vehicle) => {
      const option = document.createElement("option");
      option.value = vehicle.id;
      option.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${currency.format(Number(vehicle.price || 0))}`;
      els.quoteVehicle.appendChild(option);
    });
    els.quoteVehicle.value = selected;
  }

  function handleVehicleSubmit(event) {
    event.preventDefault();
    const id = els.vehicleId.value || `fbx-${Date.now()}`;
    const vehicle = {
      id,
      year: Number(els.vehicleYear.value),
      make: els.vehicleMake.value.trim(),
      model: els.vehicleModel.value.trim(),
      body: els.vehicleBody.value,
      price: Number(els.vehiclePrice.value),
      mileage: Number(els.vehicleMileage.value),
      status: els.vehicleStatus.value,
      location: els.vehicleLocation.value.trim(),
      image: els.vehicleImage.value.trim() || HERO_IMAGE,
      notes: els.vehicleNotes.value.trim()
    };

    const existingIndex = inventory.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      inventory[existingIndex] = vehicle;
    } else {
      inventory.unshift(vehicle);
    }

    writeStorage(STORAGE.inventory, inventory);
    writeRawStorage(STORAGE.inventoryVersion, CONFIG_VERSION);
    resetVehicleForm();
    renderAll();
  }

  function editVehicle(id) {
    const vehicle = findVehicle(id);
    if (!vehicle) return;
    els.vehicleId.value = vehicle.id;
    els.vehicleYear.value = vehicle.year;
    els.vehicleMake.value = vehicle.make;
    els.vehicleModel.value = vehicle.model;
    els.vehicleBody.value = vehicle.body;
    els.vehiclePrice.value = vehicle.price;
    els.vehicleMileage.value = vehicle.mileage;
    els.vehicleStatus.value = vehicle.status;
    els.vehicleLocation.value = vehicle.location;
    els.vehicleImage.value = vehicle.image === HERO_IMAGE ? "" : vehicle.image;
    els.vehicleNotes.value = vehicle.notes || "";
    els.saveVehicle.textContent = "Update vehicle";
    els.cancelEdit.hidden = false;
    els.vehicleForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function removeVehicle(id) {
    const vehicle = findVehicle(id);
    if (!vehicle) return;
    const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    if (!window.confirm(`Remove ${label} from inventory?`)) return;
    inventory = inventory.filter((item) => item.id !== id);
    writeStorage(STORAGE.inventory, inventory);
    writeRawStorage(STORAGE.inventoryVersion, CONFIG_VERSION);
    renderAll();
  }

  function resetVehicleForm() {
    els.vehicleForm.reset();
    els.vehicleId.value = "";
    els.vehicleBody.value = "Sedan";
    els.vehicleStatus.value = "Available";
    els.saveVehicle.textContent = "Save vehicle";
    els.cancelEdit.hidden = true;
  }

  function exportInventory() {
    const payload = {
      exportedAt: new Date().toISOString(),
      configVersion: CONFIG_VERSION,
      settings,
      inventory,
      quotes,
      contacts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "felix-b-auto-export-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restoreConfigInventory() {
    if (!window.confirm("Replace current local inventory with vehicles from config.js? Saved quote and contact requests will stay.")) return;
    inventory = clone(CONFIG_INVENTORY);
    writeStorage(STORAGE.inventory, inventory);
    writeRawStorage(STORAGE.inventoryVersion, CONFIG_VERSION);
    resetVehicleForm();
    renderAll();
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    settings = {
      whatsappNumber: els.settingWhatsApp.value.trim(),
      email: els.settingEmail.value.trim() || DEFAULT_SETTINGS.email
    };
    writeStorage(STORAGE.settings, settings);
    writeRawStorage(STORAGE.settingsVersion, CONFIG_VERSION);
    syncSettingsLinks();
  }

  function syncSettingsFields() {
    els.settingWhatsApp.value = settings.whatsappNumber || "";
    els.settingEmail.value = settings.email || DEFAULT_SETTINGS.email;
  }

  function syncSettingsLinks() {
    const email = settings.email || DEFAULT_SETTINGS.email;
    els.emailLink.href = `mailto:${email}`;
    els.emailLink.textContent = email;
  }

  function openQuoteDialog(vehicleId) {
    populateQuoteVehicleOptions(vehicleId);
    els.quoteStatus.textContent = "";
    els.quoteDialog.hidden = false;
    setTimeout(() => els.quoteName.focus(), 0);
  }

  function closeQuoteDialog() {
    els.quoteDialog.hidden = true;
    els.quoteForm.reset();
    populateQuoteVehicleOptions();
  }

  function handleQuoteSubmit(event) {
    event.preventDefault();
    const submitter = event.submitter;
    const vehicle = findVehicle(els.quoteVehicle.value);
    const quote = {
      id: `quote-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "New",
      name: els.quoteName.value.trim(),
      contact: els.quoteContact.value.trim(),
      vehicleId: vehicle ? vehicle.id : "",
      vehicleLabel: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "General sourcing request",
      country: els.quoteCountry.value.trim(),
      port: els.quotePort.value.trim(),
      budget: els.quoteBudget.value ? Number(els.quoteBudget.value) : "",
      timeline: els.quoteTimeline.value,
      notes: els.quoteNotes.value.trim()
    };

    quotes.unshift(quote);
    writeStorage(STORAGE.quotes, quotes);
    renderQuoteTable();
    renderMetrics();
    els.quoteStatus.textContent = "Quote request saved.";

    if (submitter && submitter.value === "whatsapp") {
      openExternal(buildWhatsAppUrl(buildQuoteMessage(quote)));
    }
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    const submission = {
      id: `contact-${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: els.contactName.value.trim(),
      method: els.contactMethod.value.trim(),
      topic: els.contactTopic.value,
      message: els.contactMessage.value.trim(),
      channel: els.contactChannel.value
    };
    contacts.unshift(submission);
    writeStorage(STORAGE.contacts, contacts);

    const message = [
      "Hello Felix B Auto Export,",
      `Name: ${submission.name}`,
      `Contact: ${submission.method}`,
      `Topic: ${submission.topic}`,
      `Message: ${submission.message}`
    ].join("\n");

    if (submission.channel === "email") {
      const subject = encodeURIComponent(`Website inquiry: ${submission.topic}`);
      const body = encodeURIComponent(message);
      openExternal(`mailto:${settings.email || DEFAULT_SETTINGS.email}?subject=${subject}&body=${body}`);
    } else {
      openExternal(buildWhatsAppUrl(message));
    }

    els.contactForm.reset();
    els.contactStatus.textContent = "Message saved and opened in your selected channel.";
  }

  function toggleQuoteStatus(id) {
    quotes = quotes.map((quote) => {
      if (quote.id !== id) return quote;
      return Object.assign({}, quote, { status: quote.status === "Contacted" ? "New" : "Contacted" });
    });
    writeStorage(STORAGE.quotes, quotes);
    renderQuoteTable();
  }

  function deleteQuote(id) {
    if (!window.confirm("Delete this quote request?")) return;
    quotes = quotes.filter((quote) => quote.id !== id);
    writeStorage(STORAGE.quotes, quotes);
    renderQuoteTable();
    renderMetrics();
  }

  function findVehicle(id) {
    return inventory.find((vehicle) => vehicle.id === id);
  }

  function buildVehicleMessage(vehicle) {
    if (!vehicle) return "Hello Felix B Auto Export, I would like a vehicle export quote.";
    return [
      "Hello Felix B Auto Export,",
      `I am interested in this vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
      `Listed price: ${currency.format(Number(vehicle.price || 0))}`,
      `Location: ${vehicle.location}`,
      "Please send export quote details and next steps."
    ].join("\n");
  }

  function buildQuoteMessage(quote) {
    return [
      "New vehicle export quote request",
      `Name: ${quote.name}`,
      `Contact: ${quote.contact}`,
      `Vehicle: ${quote.vehicleLabel}`,
      `Destination: ${quote.country}${quote.port ? " - " + quote.port : ""}`,
      `Budget: ${quote.budget ? currency.format(Number(quote.budget)) : "Not provided"}`,
      `Timeline: ${quote.timeline}`,
      `Notes: ${quote.notes || "None"}`
    ].join("\n");
  }

  function buildWhatsAppUrl(message) {
    const number = (settings.whatsappNumber || "").replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }

  function openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function formatMiles(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();

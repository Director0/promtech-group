/* =============================================================================
   privacy.js — builds privacy.html: shared nav/footer + fills operator requisites
   and contacts from config.legal / config.contact. Plain script (uses PAGEKIT).
   ========================================================================== */
(function () {
  var C = window.SITE_CONFIG || {};
  var PK = window.PAGEKIT || {};
  var legal = C.legal || {};
  var contact = C.contact || {};

  // Lookup for [data-legal="key"] placeholders: legal requisites + contact info.
  var values = {
    companyLegalName: legal.companyLegalName,
    inn: legal.inn,
    kpp: legal.kpp,
    ogrn: legal.ogrn,
    policyDate: legal.policyDate,
    email: contact.email,
    phone: contact.phone,
    address: contact.address
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (PK.buildNav) PK.buildNav([{ label: "Политика", href: "privacy.html", current: true }]);
    if (PK.buildFooter) PK.buildFooter();

    document.querySelectorAll("[data-legal]").forEach(function (el) {
      var v = values[el.getAttribute("data-legal")];
      if (v) el.textContent = v;
    });

    if (PK.initReveal) PK.initReveal();
  });
})();

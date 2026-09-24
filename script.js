/* =========================================================
   KITEEZI RECREATIONAL CENTER
   MAIN PUBLIC + ADMIN JAVASCRIPT
========================================================= */


/* =========================================================
   1. SUPABASE
========================================================= */

const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";

/*
   IMPORTANT:
   We use "supabaseClient", NOT "supabase".

   The Supabase CDN already uses the global name "supabase".
   Using the same name caused your:
   "Identifier 'supabase' has already been declared" error.
*/

const supabaseClient =
  window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


/* =========================================================
   2. GENERAL VARIABLES
========================================================= */

let cart = [];

let currentMediaArea = "all";


/* =========================================================
   3. PAGE STARTUP
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  /* Year */
  const yearElements =
    document.querySelectorAll("#current-year");

  yearElements.forEach(element => {
    element.textContent = new Date().getFullYear();
  });


  /* Public website */
  await loadAnnouncement();
  await fetchSupabaseMenuItems();
  await fetchBuffetPackages();
  await loadPublicMedia();
  await loadReviews();
  await loadPersonnel();


  /* Admin */
  await checkAdminSession();


  /* Cart */
  updateCartDisplay();


  /* Mobile navigation */
  setupMobileNavigation();


  /* Authentication listener */
  if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
      async () => {
        await checkAdminSession();
      }
    );

  }

});


/* =========================================================
   4. MOBILE NAVIGATION
========================================================= */

function setupMobileNavigation() {

  const toggle =
    document.getElementById("nav-toggle");

  const links =
    document.getElementById("nav-links");

  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {

    links.classList.toggle("open");

  });

}


/* =========================================================
   5. ANNOUNCEMENT
========================================================= */

async function loadAnnouncement() {

  const elements =
    document.querySelectorAll(
      "#live-announcement-bar"
    );

  if (!elements.length || !supabaseClient) return;

  const { data, error } =
    await supabaseClient
      .from("site_announcements")
      .select("*")
      .eq("active", true)
      .order("id", {
        ascending: false
      })
      .limit(1);

  if (error) {

    console.error(
      "Announcement error:",
      error
    );

    elements.forEach(element => {

      element.innerHTML =
        '<i class="fa-solid fa-bullhorn"></i> Welcome to Kiteezi Recreational Center';

    });

    return;
  }

  const announcement =
    data && data.length
      ? data[0]
      : null;

  elements.forEach(element => {

    if (announcement) {

      element.innerHTML =
        `<i class="fa-solid fa-bullhorn"></i> ${escapeHTML(
          announcement.message ||
          announcement.text ||
          announcement.title ||
          ""
        )}`;

    } else {

      element.innerHTML =
        '<i class="fa-solid fa-bullhorn"></i> Welcome to Kiteezi Recreational Center';

    }

  });

}


/* =========================================================
   6. ADMIN ANNOUNCEMENT UPDATE
========================================================= */

async function updateAnnouncement(event) {

  event.preventDefault();

  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return;
  }

  const input =
    document.getElementById(
      "admin-announcement-input"
    );

  if (!input) return;

  const message =
    input.value.trim();

  if (!message) {
    alert("Please enter an announcement.");
    return;
  }


  const { data: userData } =
    await supabaseClient.auth.getUser();

  if (!userData.user) {
    alert("You must be logged in as admin.");
    return;
  }


  /* Disable previous announcements */

  const { error: disableError } =
    await supabaseClient
      .from("site_announcements")
      .update({
        active: false
      })
      .eq("active", true);

  if (disableError) {

    alert(
      "Could not disable old announcement: " +
      disableError.message
    );

    return;
  }


  /* Insert new announcement */

  const { error } =
    await supabaseClient
      .from("site_announcements")
      .insert({
        message: message,
        active: true
      });

  if (error) {

    alert(
      "Could not update announcement: " +
      error.message
    );

    return;
  }

  alert("Announcement updated successfully.");

  input.value = "";

  await loadAnnouncement();

}


/* =========================================================
   7. MENU
========================================================= */

async function fetchSupabaseMenuItems(
  category = "all"
) {

  const grid =
    document.getElementById("menu-grid");

  if (!grid || !supabaseClient) return;


  grid.innerHTML =
    "<p>Loading live menu...</p>";


  let query =
    supabaseClient
      .from("menu_items")
      .select("*")
      .order("id", {
        ascending: false
      });


  if (category !== "all") {

    query =
      query.eq(
        "category",
        category
      );

  }


  const {
    data,
    error
  } = await query;


  if (error) {

    console.error(
      "Menu error:",
      error
    );

    grid.innerHTML =
      "<p>Error loading menu items.</p>";

    return;
  }


  grid.innerHTML = "";


  if (!data || data.length === 0) {

    grid.innerHTML =
      "<p>No items found in this category.</p>";

    return;
  }


  data.forEach(item => {

    if (item.in_stock === false) return;


    const card =
      document.createElement("div");

    card.className =
      "menu-card";


    const image =
      item.img_url ||
      "https://via.placeholder.com/500x350?text=Kiteezi+Food";


    card.innerHTML = `

      <div>

        <img
          src="${escapeAttribute(image)}"
          class="menu-img"
          alt="${escapeAttribute(item.name)}"
        >

        <div class="menu-card-title">
          ${escapeHTML(item.name)}
        </div>

        <div class="menu-card-price">
          ${Number(item.price || 0).toLocaleString()} UGX
        </div>

      </div>

      <button
        class="btn-primary full-width-btn"
        onclick='addToCart(${JSON.stringify(
          item.name
        )}, ${Number(item.price || 0)})'
      >

        <i class="fa-solid fa-plus"></i>
        Add to Order

      </button>

    `;


    grid.appendChild(card);

  });

}


/* =========================================================
   8. MENU CATEGORY FILTER
========================================================= */

function filterCategory(
  category,
  button
) {

  document
    .querySelectorAll(".tab-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });


  if (button) {
    button.classList.add("active");
  }


  fetchSupabaseMenuItems(category);

}


/* =========================================================
   9. ADMIN MENU ITEMS
========================================================= */

async function fetchAdminItems() {

  const container =
    document.getElementById(
      "admin-menu-render-list"
    );

  if (!container || !supabaseClient) return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("menu_items")
      .select("*")
      .order("id", {
        ascending: false
      });


  if (error) {

    container.innerHTML =
      `<p>Error: ${escapeHTML(
        error.message
      )}</p>`;

    return;
  }


  container.innerHTML = "";


  if (!data || !data.length) {

    container.innerHTML =
      "<p>No menu items yet.</p>";

    return;
  }


  data.forEach(item => {

    const row =
      document.createElement("div");

    row.className =
      "admin-menu-row";


    row.innerHTML = `

      <div class="admin-menu-info">

        <strong>
          ${escapeHTML(item.name)}
        </strong>

        <small>
          ${Number(item.price || 0).toLocaleString()}
          UGX
          —
          ${escapeHTML(item.category)}
        </small>

        <small>
          Status:
          ${
            item.in_stock === false
              ? "Unavailable"
              : "Available"
          }
        </small>

      </div>

      <div class="admin-menu-actions">

        <button
          class="admin-edit-btn"
          onclick="editMenuItem(${item.id})"
        >
          <i class="fa-solid fa-pen"></i>
        </button>

        <button
          class="admin-delete-btn"
          onclick="deleteMenuItem(${item.id})"
        >
          <i class="fa-solid fa-trash"></i>
        </button>

      </div>

    `;


    container.appendChild(row);

  });

}


/* =========================================================
   10. SAVE MENU ITEM
========================================================= */

async function handleSaveMenuItem(event) {

  event.preventDefault();

  if (!supabaseClient) {
    alert("Supabase is not configured.");
    return;
  }


  const name =
    document.getElementById(
      "menu-title-input"
    )?.value.trim();


  const price =
    Number(
      document.getElementById(
        "menu-price-input"
      )?.value
    );


  const category =
    document.getElementById(
      "menu-category-input"
    )?.value;


  const img_url =
    document.getElementById(
      "menu-img-input"
    )?.value.trim();


  const requires_sides =
    document.getElementById(
      "menu-sides-check"
    )?.checked || false;


  const in_stock =
    document.getElementById(
      "menu-avail-check"
    )?.checked ?? true;


  if (!name || !price || !category) {

    alert(
      "Please fill in the item name, price and category."
    );

    return;
  }


  const { error } =
    await supabaseClient
      .from("menu_items")
      .insert({

        name,
        price,
        category,
        img_url: img_url || null,
        requires_sides,
        in_stock

      });


  if (error) {

    alert(
      "Could not save menu item: " +
      error.message
    );

    return;
  }


  alert("Menu item added successfully.");


  document.getElementById(
    "menu-title-input"
  ).value = "";

  document.getElementById(
    "menu-price-input"
  ).value = "";

  document.getElementById(
    "menu-img-input"
  ).value = "";


  await fetchAdminItems();
  await fetchSupabaseMenuItems();

}


/* =========================================================
   11. EDIT MENU ITEM
========================================================= */

async function editMenuItem(id) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single();


  if (error) {

    alert(
      "Could not load item: " +
      error.message
    );

    return;
  }


  const name =
    prompt(
      "Item name:",
      data.name
    );

  if (name === null) return;


  const price =
    prompt(
      "Price in UGX:",
      data.price
    );

  if (price === null) return;


  const category =
    prompt(
      "Category:",
      data.category
    );

  if (category === null) return;


  const image =
    prompt(
      "Image URL:",
      data.img_url || ""
    );

  if (image === null) return;


  const available =
    confirm(
      "Click OK if this item is AVAILABLE.\nClick Cancel if it should be UNAVAILABLE."
    );


  const {
    error: updateError
  } =
    await supabaseClient
      .from("menu_items")
      .update({

        name: name.trim(),

        price: Number(price),

        category: category.trim(),

        img_url:
          image.trim() || null,

        in_stock: available

      })
      .eq("id", id);


  if (updateError) {

    alert(
      "Could not update item: " +
      updateError.message
    );

    return;
  }


  alert("Menu item updated.");

  await fetchAdminItems();
  await fetchSupabaseMenuItems();

}


/* =========================================================
   12. DELETE MENU ITEM
========================================================= */

async function deleteMenuItem(id) {

  if (
    !confirm(
      "Are you sure you want to delete this menu item?"
    )
  ) return;


  const {
    error
  } =
    await supabaseClient
      .from("menu_items")
      .delete()
      .eq("id", id);


  if (error) {

    alert(
      "Could not delete item: " +
      error.message
    );

    return;
  }


  await fetchAdminItems();
  await fetchSupabaseMenuItems();

}


/* =========================================================
   13. BUFFET PACKAGES
========================================================= */

async function fetchBuffetPackages() {

  const container =
    document.getElementById(
      "buffet-packages-grid"
    );

  if (!container || !supabaseClient) return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("buffet_packages")
      .select("*")
      .order("id", {
        ascending: true
      });


  if (error) {

    console.error(
      "Buffet error:",
      error
    );

    container.innerHTML =
      "<p>Unable to load buffet packages.</p>";

    return;
  }


  container.innerHTML = "";


  if (!data || !data.length) {

    container.innerHTML =
      "<p>No buffet packages available.</p>";

    return;
  }


  data.forEach(pkg => {

    const card =
      document.createElement("div");

    card.className =
      "card highlight";


    card.innerHTML = `

      <i class="${
        escapeAttribute(
          pkg.icon_class ||
          "fa-solid fa-utensils"
        )
      } icon"></i>

      <h3>
        ${escapeHTML(
          pkg.title ||
          pkg.name ||
          ""
        )}
      </h3>

      <p>
        ${escapeHTML(
          pkg.description ||
          ""
        )}
      </p>

      <div
        style="
          font-weight:bold;
          margin-top:10px;
          color:var(--primary-red);
        "
      >
        ${Number(
          pkg.price || 0
        ).toLocaleString()}
        UGX / Person
      </div>

    `;


    container.appendChild(card);

  });

}


/* =========================================================
   14. MEDIA MANAGEMENT
========================================================= */

async function loadPublicMedia() {

  if (!supabaseClient) return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("website_images")
      .select("*")
      .order("position", {
        ascending: true
      })
      .order("id", {
        ascending: true
      });


  if (error) {

    console.error(
      "Media loading error:",
      error
    );

    return;
  }


  if (!data) return;


  const areas =
    [
      "about",
      "swimming",
      "sports",
      "events",
      "restaurant"
    ];


  areas.forEach(area => {

    const container =
      document.querySelector(
        `[data-media-area="${area}"]`
      );


    if (!container) return;


    const media =
      data.filter(
        item =>
          item.area === area
      );


    if (!media.length) return;


    container.innerHTML = "";


    media.forEach(
      (item, index) => {

        const slide =
          document.createElement(
            "div"
          );

        slide.className =
          "media-slide";

        if (index === 0) {
          slide.classList.add(
            "active"
          );
        }


        if (
          item.media_type ===
          "video"
        ) {

          slide.innerHTML = `

            <video
              src="${escapeAttribute(
                item.media_url
              )}"
              muted
              autoplay
              loop
              playsinline
            ></video>

          `;

        } else {

          slide.innerHTML = `

            <img
              src="${escapeAttribute(
                item.media_url
              )}"
              alt="Kiteezi Recreational Center"
            >

          `;

        }


        container.appendChild(
          slide
        );

      }

    );


    initializeGallery(
      container
    );

  });

}


/* =========================================================
   15. GALLERY INITIALIZATION
========================================================= */

function initializeGallery(
  gallery
) {

  if (!gallery) return;


  const slides =
    gallery.querySelectorAll(
      ".media-slide"
    );


  if (slides.length <= 1) return;


  let current = 0;


  function showSlide(index) {

    slides.forEach(
      slide =>
        slide.classList.remove(
          "active"
        )
    );


    slides[index].classList.add(
      "active"
    );

  }


  const next =
    document.createElement(
      "button"
    );

  next.className =
    "gallery-next";

  next.innerHTML = "❯";


  const previous =
    document.createElement(
      "button"
    );

  previous.className =
    "gallery-prev";

  previous.innerHTML = "❮";


  gallery.appendChild(
    previous
  );

  gallery.appendChild(
    next
  );


  next.addEventListener(
    "click",
    () => {

      current =
        (current + 1) %
        slides.length;

      showSlide(current);

    }
  );


  previous.addEventListener(
    "click",
    () => {

      current =
        (current - 1 +
          slides.length) %
        slides.length;

      showSlide(current);

    }
  );

}


/* =========================================================
   16. ADMIN MEDIA LIST
========================================================= */

async function loadAdminMedia(
  area = "all"
) {

  const container =
    document.getElementById(
      "admin-media-list"
    );

  if (!container || !supabaseClient)
    return;


  let query =
    supabaseClient
      .from("website_images")
      .select("*")
      .order("area", {
        ascending: true
      })
      .order("position", {
        ascending: true
      });


  if (area !== "all") {

    query =
      query.eq(
        "area",
        area
      );

  }


  const {
    data,
    error
  } = await query;


  if (error) {

    container.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;

    return;
  }


  container.innerHTML = "";


  if (!data || !data.length) {

    container.innerHTML =
      "<p>No media found.</p>";

    return;
  }


  data.forEach(item => {

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "admin-media-row";


    let preview = "";


    if (
      item.media_type ===
      "video"
    ) {

      preview = `

        <video
          src="${escapeAttribute(
            item.media_url
          )}"
          muted
          playsinline
        ></video>

      `;

    } else {

      preview = `

        <img
          src="${escapeAttribute(
            item.media_url
          )}"
          alt=""
        >

      `;

    }


    row.innerHTML = `

      <div class="admin-media-preview">
        ${preview}
      </div>

      <div class="admin-media-details">

        <strong>
          ${escapeHTML(
            item.area
          )}
        </strong>

        <span>
          ${escapeHTML(
            item.media_type
          )}
        </span>

        <small>
          Position:
          ${Number(
            item.position || 0
          )}
        </small>

      </div>

      <button
        class="admin-delete-btn"
        onclick="deleteMedia(${item.id})"
      >
        <i class="fa-solid fa-trash"></i>
        Delete
      </button>

    `;


    container.appendChild(
      row
    );

  });

}


/* =========================================================
   17. ADMIN MEDIA UPLOAD
========================================================= */

async function handleMediaUpload(
  event
) {

  event.preventDefault();


  if (!supabaseClient) {

    alert(
      "Supabase is not configured."
    );

    return;
  }


  const fileInput =
    document.getElementById(
      "media-file-input"
    );

  const areaInput =
    document.getElementById(
      "media-area-input"
    );


  if (!fileInput || !fileInput.files.length) {

    alert(
      "Please select an image or video."
    );

    return;
  }


  const file =
    fileInput.files[0];


  const area =
    areaInput.value;


  let mediaType =
    "image";


  if (
    file.type.startsWith(
      "video/"
    )
  ) {

    mediaType =
      "video";

  }


  const extension =
    file.name
      .split(".")
      .pop();


  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;


  const filePath =
    `${area}/${fileName}`;


  const {
    error: uploadError
  } =
    await supabaseClient
      .storage
      .from("website-images")
      .upload(
        filePath,
        file
      );


  if (uploadError) {

    alert(
      "Upload failed: " +
      uploadError.message
    );

    return;
  }


  const {
    data: publicData
  } =
    supabaseClient
      .storage
      .from("website-images")
      .getPublicUrl(
        filePath
      );


  const publicUrl =
    publicData.publicUrl;


  const {
    error: databaseError
  } =
    await supabaseClient
      .from("website_images")
      .insert({

        area: area,

        media_type:
          mediaType,

        media_url:
          publicUrl,

        position: 0

      });


  if (databaseError) {

    alert(
      "File uploaded but database record failed: " +
      databaseError.message
    );

    return;
  }


  alert(
    "Media uploaded successfully."
  );


  fileInput.value = "";


  await loadAdminMedia(
    area
  );

  await loadPublicMedia();

}


/* =========================================================
   18. DELETE MEDIA
========================================================= */

async function deleteMedia(
  id
) {

  if (
    !confirm(
      "Delete this media from the website?"
    )
  ) return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("website_images")
      .select("*")
      .eq("id", id)
      .single();


  if (error) {

    alert(
      "Could not find media: " +
      error.message
    );

    return;
  }


  const {
    error: deleteDatabaseError
  } =
    await supabaseClient
      .from("website_images")
      .delete()
      .eq("id", id);


  if (deleteDatabaseError) {

    alert(
      "Could not delete media: " +
      deleteDatabaseError.message
    );

    return;
  }


  /*
     Try deleting the physical file too.
     This is optional and will not prevent
     database deletion if the path cannot
     be determined.
  */

  try {

    const url =
      new URL(
        data.media_url
      );

    const marker =
      "/storage/v1/object/public/website-images/";

    const index =
      url.pathname.indexOf(
        marker
      );


    if (index !== -1) {

      const path =
        decodeURIComponent(
          url.pathname.substring(
            index +
            marker.length
          )
        );


      await supabaseClient
        .storage
        .from("website-images")
        .remove([
          path
        ]);

    }

  } catch (storageError) {

    console.warn(
      "Storage file could not be removed:",
      storageError
    );

  }


  alert(
    "Media deleted."
  );


  await loadAdminMedia(
    currentMediaArea
  );

  await loadPublicMedia();

}


/* =========================================================
   19. PERSONNEL
========================================================= */

async function loadPersonnel() {

  const container =
    document.getElementById(
      "personnel-container"
    );

  if (!container || !supabaseClient)
    return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("personnel")
      .select("*")
      .order("position", {
        ascending: true
      })
      .order("id", {
        ascending: true
      });


  if (error) {

    console.error(
      "Personnel error:",
      error
    );

    container.innerHTML =
      "<div class='empty-team'>Unable to load personnel.</div>";

    return;
  }


  container.innerHTML = "";


  if (!data || !data.length) {

    container.innerHTML =
      "<div class='empty-team'>Our team information will be available soon.</div>";

    return;
  }


  data.forEach(person => {

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "personnel-card";


    card.innerHTML = `

      <div class="personnel-image">

        <img
          src="${
            escapeAttribute(
              person.image_url ||
              "https://via.placeholder.com/500x500?text=Staff"
            )
          }"
          alt="${escapeAttribute(
            person.name
          )}"
        >

      </div>

      <div class="personnel-info">

        <h2>
          ${escapeHTML(
            person.name
          )}
        </h2>

        <h3>
          ${escapeHTML(
            person.role ||
            ""
          )}
        </h3>

        <p>
          ${escapeHTML(
            person.bio ||
            ""
          )}
        </p>

      </div>

    `;


    container.appendChild(
      card
    );

  });

}


/* =========================================================
   20. ADMIN PERSONNEL
========================================================= */

async function loadAdminPersonnel() {

  const container =
    document.getElementById(
      "admin-personnel-list"
    );

  if (!container || !supabaseClient)
    return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("personnel")
      .select("*")
      .order("position", {
        ascending: true
      });


  if (error) {

    container.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;

    return;
  }


  container.innerHTML = "";


  data.forEach(person => {

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "admin-person-row";


    row.innerHTML = `

      <img
        src="${escapeAttribute(
          person.image_url ||
          "https://via.placeholder.com/100"
        )}"
        alt=""
      >

      <div>

        <strong>
          ${escapeHTML(
            person.name
          )}
        </strong>

        <small>
          ${escapeHTML(
            person.role ||
            ""
          )}
        </small>

      </div>

      <div>

        <button
          class="admin-edit-btn"
          onclick="editPersonnel(${person.id})"
        >
          Edit
        </button>

        <button
          class="admin-delete-btn"
          onclick="deletePersonnel(${person.id})"
        >
          Delete
        </button>

      </div>

    `;


    container.appendChild(
      row
    );

  });

}


/* =========================================================
   21. SAVE PERSONNEL
========================================================= */

async function handleSavePersonnel(
  event
) {

  event.preventDefault();


  const name =
    document.getElementById(
      "personnel-name-input"
    )?.value.trim();


  const role =
    document.getElementById(
      "personnel-role-input"
    )?.value.trim();


  const bio =
    document.getElementById(
      "personnel-bio-input"
    )?.value.trim();


  const image =
    document.getElementById(
      "personnel-image-input"
    )?.value.trim();


  if (!name || !role) {

    alert(
      "Name and role are required."
    );

    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("personnel")
      .insert({

        name,

        role,

        bio:
          bio || null,

        image_url:
          image || null

      });


  if (error) {

    alert(
      "Could not save personnel: " +
      error.message
    );

    return;
  }


  alert(
    "Personnel member added."
  );


  event.target.reset();


  await loadAdminPersonnel();
  await loadPersonnel();

}


/* =========================================================
   22. EDIT PERSONNEL
========================================================= */

async function editPersonnel(
  id
) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("personnel")
      .select("*")
      .eq("id", id)
      .single();


  if (error) {

    alert(
      "Could not load personnel."
    );

    return;
  }


  const name =
    prompt(
      "Name:",
      data.name
    );

  if (name === null) return;


  const role =
    prompt(
      "Role:",
      data.role || ""
    );

  if (role === null) return;


  const bio =
    prompt(
      "Description:",
      data.bio || ""
    );

  if (bio === null) return;


  const image =
    prompt(
      "Image URL:",
      data.image_url || ""
    );

  if (image === null) return;


  const {
    error: updateError
  } =
    await supabaseClient
      .from("personnel")
      .update({

        name:
          name.trim(),

        role:
          role.trim(),

        bio:
          bio.trim(),

        image_url:
          image.trim() || null

      })
      .eq("id", id);


  if (updateError) {

    alert(
      "Update failed: " +
      updateError.message
    );

    return;
  }


  await loadAdminPersonnel();
  await loadPersonnel();

}


/* =========================================================
   23. DELETE PERSONNEL
========================================================= */

async function deletePersonnel(
  id
) {

  if (
    !confirm(
      "Delete this personnel member?"
    )
  ) return;


  const {
    error
  } =
    await supabaseClient
      .from("personnel")
      .delete()
      .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadAdminPersonnel();
  await loadPersonnel();

}


/* =========================================================
   24. REVIEWS
========================================================= */

async function loadReviews() {

  const container =
    document.getElementById(
      "reviews-container"
    );

  if (!container || !supabaseClient)
    return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("reviews")
      .select("*")
      .eq("approved", true)
      .order("id", {
        ascending: false
      });


  if (error) {

    console.error(
      "Reviews error:",
      error
    );

    return;
  }


  container.innerHTML = "";


  if (!data || !data.length) {

    container.innerHTML =
      "<p>No reviews yet.</p>";

    return;
  }


  data.forEach(review => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "review-card";


    card.innerHTML = `

      <h3>
        ${escapeHTML(
          review.name ||
          "Guest"
        )}
      </h3>

      <div class="review-rating">

        ${"★".repeat(
          Number(
            review.rating || 0
          )
        )}

        ${"☆".repeat(
          5 -
          Number(
            review.rating || 0
          )
        )}

      </div>

      <p>
        ${escapeHTML(
          review.review_text ||
          review.text ||
          ""
        )}
      </p>

    `;


    container.appendChild(
      card
    );

  });

}


/* =========================================================
   25. SUBMIT REVIEW
========================================================= */

async function submitReview(
  event
) {

  event.preventDefault();


  const name =
    document.getElementById(
      "review-name"
    )?.value.trim();


  const rating =
    Number(
      document.getElementById(
        "review-rating"
      )?.value
    );


  const reviewText =
    document.getElementById(
      "review-text"
    )?.value.trim();


  const status =
    document.getElementById(
      "review-status"
    );


  const {
    error
  } =
    await supabaseClient
      .from("reviews")
      .insert({

        name,

        rating,

        review_text:
          reviewText,

        approved:
          false

      });


  if (error) {

    if (status) {
      status.textContent =
        "Could not submit review.";
    }

    console.error(error);

    return;
  }


  if (status) {

    status.textContent =
      "Thank you! Your review has been submitted for approval.";

  }


  event.target.reset();

}


/* =========================================================
   26. ADMIN REVIEWS
========================================================= */

async function loadAdminReviews() {

  const container =
    document.getElementById(
      "admin-reviews-list"
    );

  if (!container || !supabaseClient)
    return;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("reviews")
      .select("*")
      .order("id", {
        ascending: false
      });


  if (error) {

    container.innerHTML =
      `<p>${escapeHTML(
        error.message
      )}</p>`;

    return;
  }


  container.innerHTML = "";


  data.forEach(review => {

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "admin-review-row";


    row.innerHTML = `

      <div>

        <strong>
          ${escapeHTML(
            review.name ||
            "Guest"
          )}
        </strong>

        <span>
          ${"★".repeat(
            Number(
              review.rating || 0
            )
          )}
        </span>

        <p>
          ${escapeHTML(
            review.review_text ||
            review.text ||
            ""
          )}
        </p>

        <small>
          ${
            review.approved
              ? "Approved"
              : "Pending"
          }
        </small>

      </div>

      <div>

        ${
          !review.approved
            ? `
              <button
                class="admin-edit-btn"
                onclick="approveReview(${review.id})"
              >
                Approve
              </button>
            `
            : ""
        }

        <button
          class="admin-delete-btn"
          onclick="deleteReview(${review.id})"
        >
          Delete
        </button>

      </div>

    `;


    container.appendChild(
      row
    );

  });

}


/* =========================================================
   27. APPROVE REVIEW
========================================================= */

async function approveReview(
  id
) {

  const {
    error
  } =
    await supabaseClient
      .from("reviews")
      .update({
        approved: true
      })
      .eq("id", id);


  if (error) {

    alert(
      "Could not approve review: " +
      error.message
    );

    return;
  }


  await loadAdminReviews();
  await loadReviews();

}


/* =========================================================
   28. DELETE REVIEW
========================================================= */

async function deleteReview(
  id
) {

  if (
    !confirm(
      "Delete this review permanently?"
    )
  ) return;


  const {
    error
  } =
    await supabaseClient
      .from("reviews")
      .delete()
      .eq("id", id);


  if (error) {

    alert(
      "Could not delete review: " +
      error.message
    );

    return;
  }


  await loadAdminReviews();
  await loadReviews();

}


/* =========================================================
   29. ADMIN AUTHENTICATION
========================================================= */

async function checkAdminSession() {

  const loginCard =
    document.getElementById(
      "admin-login-card"
    );

  const dashboard =
    document.getElementById(
      "admin-dashboard-view"
    );


  if (
    !loginCard ||
    !dashboard ||
    !supabaseClient
  ) return;


  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (error) {

    console.error(
      "Session error:",
      error
    );

    return;
  }


  const session =
    data.session;


  if (session) {

    loginCard.style.display =
      "none";


    const recoveryCard =
      document.getElementById(
        "admin-recovery-card"
      );


    if (recoveryCard) {

      recoveryCard.style.display =
        "none";

    }


    dashboard.style.display =
      "block";


    const userDisplay =
      document.getElementById(
        "logged-in-user-email"
      );


    if (userDisplay) {

      userDisplay.innerText =
        `Logged in: ${session.user.email}`;

    }


    await fetchAdminItems();
    await loadAdminMedia();
    await loadAdminPersonnel();
    await loadAdminReviews();


  } else {

    loginCard.style.display =
      "block";

    dashboard.style.display =
      "none";

  }

}


/* =========================================================
   30. ADMIN LOGIN
========================================================= */

async function handleSupabaseLogin(
  event
) {

  event.preventDefault();


  const email =
    document.getElementById(
      "admin-email"
    )?.value.trim();


  const password =
    document.getElementById(
      "admin-password"
    )?.value;


  if (!email || !password) {

    alert(
      "Enter your email and password."
    );

    return;
  }


  const {
    error
  } =
    await supabaseClient.auth.signInWithPassword({

      email,

      password

    });


  if (error) {

    alert(
      "Login Error: " +
      error.message
    );

    return;
  }


  await checkAdminSession();

}


/* =========================================================
   31. LOGOUT
========================================================= */

async function handleSupabaseLogout() {

  if (!supabaseClient) return;


  await supabaseClient.auth.signOut();


  await checkAdminSession();

}


/* =========================================================
   32. PASSWORD RECOVERY
========================================================= */

function toggleRecoveryView(
  showRecovery
) {

  const loginCard =
    document.getElementById(
      "admin-login-card"
    );

  const recoveryCard =
    document.getElementById(
      "admin-recovery-card"
    );


  if (loginCard) {

    loginCard.style.display =
      showRecovery
        ? "none"
        : "block";

  }


  if (recoveryCard) {

    recoveryCard.style.display =
      showRecovery
        ? "block"
        : "none";

  }

}


/* =========================================================
   33. PASSWORD RESET
========================================================= */

async function handlePasswordRecovery(
  event
) {

  event.preventDefault();


  const email =
    document.getElementById(
      "recovery-email"
    )?.value.trim();


  if (!email) return;


  const {
    error
  } =
    await supabaseClient.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin +
            "/admin.html"
        }
      );


  if (error) {

    alert(
      "Recovery Error: " +
      error.message
    );

    return;
  }


  alert(
    "Password reset link sent. Check your email."
  );


  toggleRecoveryView(
    false
  );

}


/* =========================================================
   34. CART
========================================================= */

function addToCart(
  name,
  price
) {

  const existing =
    cart.find(
      item =>
        item.name === name
    );


  if (existing) {

    existing.quantity++;

  } else {

    cart.push({

      name,

      price:

        Number(price),

      quantity: 1

    });

  }


  updateCartDisplay();


  const drawer =
    document.getElementById(
      "cart-drawer"
    );


  if (drawer) {

    drawer.classList.add(
      "open"
    );

  }

}


/* =========================================================
   35. CART DISPLAY
========================================================= */

function updateCartDisplay() {

  const list =
    document.getElementById(
      "cart-items-list"
    );


  const badge =
    document.getElementById(
      "cart-badge-count"
    );


  const totalElement =
    document.getElementById(
      "cart-total-price"
    );


  let total = 0;

  let quantity = 0;


  if (list) {

    list.innerHTML = "";

  }


  cart.forEach(
    (item, index) => {

      total +=
        item.price *
        item.quantity;

      quantity +=
        item.quantity;


      if (list) {

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "cart-item-row";


        row.innerHTML = `

          <div>

            <strong>
              ${escapeHTML(
                item.name
              )}
            </strong>

            <br>

            <small>
              ${Number(
                item.price
              ).toLocaleString()}
              UGX ×
              ${item.quantity}
            </small>

          </div>

          <div>

            <strong>
              ${Number(
                item.price *
                item.quantity
              ).toLocaleString()}
              UGX
            </strong>

            <br>

            <button
              onclick="removeFromCart(${index})"
              style="
                border:none;
                background:#dc3545;
                color:white;
                padding:3px 7px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              Remove
            </button>

          </div>

        `;


        list.appendChild(
          row
        );

      }

    }
  );


  if (badge) {

    badge.textContent =
      quantity;

  }


  if (totalElement) {

    totalElement.textContent =
      `${Number(
        total
      ).toLocaleString()} UGX`;

  }

}


/* =========================================================
   36. REMOVE FROM CART
========================================================= */

function removeFromCart(
  index
) {

  cart.splice(
    index,
    1
  );

  updateCartDisplay();

}


/* =========================================================
   37. CART DRAWER
========================================================= */

function toggleCartDrawer() {

  const drawer =
    document.getElementById(
      "cart-drawer"
    );


  if (!drawer) return;


  drawer.classList.toggle(
    "open"
  );

}


/* =========================================================
   38. WHATSAPP CHECKOUT
========================================================= */

function checkoutToWhatsApp() {

  if (!cart.length) {

    alert(
      "Your order is empty."
    );

    return;
  }


  const name =
    document.getElementById(
      "cust-name"
    )?.value.trim();


  const phone =
    document.getElementById(
      "cust-phone"
    )?.value.trim();


  const location =
    document.getElementById(
      "cust-location"
    )?.value.trim();


  if (!name || !phone) {

    alert(
      "Please enter your name and phone number."
    );

    return;
  }


  let total = 0;


  let message =
    "Hello Kiteezi Recreational Center!%0A%0A";


  message +=
    "*NEW ORDER*%0A";


  message +=
    `Name: ${encodeURIComponent(
      name
    )}%0A`;


  message +=
    `Phone: ${encodeURIComponent(
      phone
    )}%0A`;


  if (location) {

    message +=
      `Location: ${encodeURIComponent(
        location
      )}%0A`;

  }


  message +=
    "%0A*Items:*%0A";


  cart.forEach(item => {

    const subtotal =
      item.price *
      item.quantity;


    total += subtotal;


    message +=
      `• ${encodeURIComponent(
        item.name
      )} × ${item.quantity} — ${subtotal.toLocaleString()} UGX%0A`;

  });


  message +=
    `%0A*Total: ${total.toLocaleString()} UGX*`;


  /*
     NEW KITEЕZI NUMBER
     0709763803
     International format:
     256709763803
  */

  const whatsappNumber =
    "256709763803";


  const whatsappURL =
    `https://wa.me/${whatsappNumber}?text=${message}`;


  /*
     Clear cart immediately after
     successfully preparing the order.
  */

  cart = [];

  updateCartDisplay();


  const drawer =
    document.getElementById(
      "cart-drawer"
    );


  if (drawer) {

    drawer.classList.remove(
      "open"
    );

  }


  window.open(
    whatsappURL,
    "_blank"
  );

}


/* =========================================================
   39. HTML SAFETY HELPERS
========================================================= */

function escapeHTML(value) {

  if (value === null ||
      value === undefined) {

    return "";

  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );

}

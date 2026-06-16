const SHEET_URL = "https://script.google.com/macros/s/AKfycbwV-lwhIU2kDXoNCY9dvQV2ztsqwOU0eQteDBmygL6DZKHjuIPFOKXtgZHsp-8A6wVW/exec";

const BOT_TOKEN = "824983411344:AAE8N23o65UkHLQmBemZ4383CQD-fXgbLNAi7b4";
const CHAT_ID = "-10018635647257289";
const THREAD_ID = 456;

const ADMIN_MEMBER_ID = "18";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const loginContainer = document.getElementById("loginContainer");
const mainContent = document.getElementById("mainContent");
const adminContent = document.getElementById("adminContent");
const reportForm = document.getElementById("reportForm");
const reportSubmitBtn = document.getElementById("reportSubmitBtn");
const uploadForm = document.getElementById("uploadForm");
const formBtn = document.getElementById("formBtn");
const uploadBtn = document.getElementById("uploadBtn");
const memberForm = document.getElementById("memberForm");
const memberStatus = document.getElementById("memberStatus");
const baseModal = document.getElementById("baseModal");
const baseSelect = document.getElementById("baseSelect");
const confirmBaseBtn = document.getElementById("confirmBaseBtn");
const baseStatus = document.getElementById("baseStatus");
const selectedBaseDisplay = document.getElementById("selectedBaseDisplay");

const urlParams = new URLSearchParams(window.location.search);
const AVAILABLE_BASES = Array.from({ length: 16 }, (_, index) => `BTS_${index + 1}`);

let selectedBase = getInitialBase();
let pendingMember = null;
let isReportSubmitting = false;
let xhr;

populateBaseOptions();
updateBaseDisplay();

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  loginStatus.textContent = "در حال ورود...";

  try {
    const members = await fetchMembers();
    const matchedMember = members.find((member) => member.username === username && member.password === password);

    if (matchedMember) {
      localStorage.setItem("technician_username", username);
      localStorage.setItem("technician_id", matchedMember.memberId || "");
      localStorage.setItem("technician_name", `${matchedMember.firstName || ""} ${matchedMember.lastName || ""}`.trim());
      loginStatus.textContent = "";
      pendingMember = matchedMember;
      openBaseModal();
      return;
    }

    loginStatus.textContent = "❌ نام کاربری یا رمز نادرست است.";
  } catch (error) {
    console.error(error);
    loginStatus.textContent = "❌ دریافت لیست اعضا از شیت ممکن نشد.";
  }
});

confirmBaseBtn.addEventListener("click", function () {
  const chosenBase = baseSelect.value.trim();

  if (!AVAILABLE_BASES.includes(chosenBase)) {
    baseStatus.textContent = "❌ لطفاً بیس را انتخاب کنید.";
    baseSelect.focus();
    return;
  }

  if (!pendingMember) {
    baseStatus.textContent = "❌ نشست ورود معتبر نیست. دوباره وارد شوید.";
    closeBaseModal();
    return;
  }

  selectedBase = chosenBase;
  persistSelectedBase(selectedBase);
  baseStatus.textContent = "";
  closeBaseModal();
  loginSuccess(pendingMember);
  pendingMember = null;
});

function openBaseModal() {
  baseStatus.textContent = "";
  baseSelect.value = selectedBase;
  baseModal.classList.remove("hidden");
}

function closeBaseModal() {
  baseModal.classList.add("hidden");
}

function loginSuccess(member) {
  loginContainer.classList.add("hidden");
  adminContent.classList.add("hidden");
  mainContent.classList.add("hidden");
  updateBaseDisplay();

  if (isAdminMember(member)) {
    adminContent.classList.remove("hidden");
    return;
  }

  mainContent.classList.remove("hidden");

  const technicianField = document.getElementById("technician");
  const idField = document.getElementById("employee_id");
  const displayName = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username;

  technicianField.value = displayName;
  idField.value = member.memberId || member.username;
  idField.readOnly = true;
  setUploadFormDefaults(displayName);
}

function isAdminMember(member) {
  return [member.memberId, member.username]
    .map((value) => String(value || "").trim())
    .includes(ADMIN_MEMBER_ID);
}

function normalizeMember(row) {
  return {
    firstName: String(row.firstName || row.name || row["نام"] || "").trim(),
    lastName: String(row.lastName || row.familyName || row["نام خانوادگی"] || "").trim(),
    memberId: String(row.memberId || row.id || row["آیدی"] || "").trim(),
    username: String(row.username || row.user || row["یوزر"] || "").trim(),
    password: String(row.password || row.pass || row["پسورد"] || "").trim()
  };
}

async function fetchMembers() {
  const response = await fetch(`${SHEET_URL}?action=getMembers`);
  if (!response.ok) {
    throw new Error("Failed to fetch members");
  }

  const data = await response.json();
  const rows = Array.isArray(data.members) ? data.members : Array.isArray(data) ? data : [];

  return rows
    .map(normalizeMember)
    .filter((member) => member.username && member.password);
}

formBtn.addEventListener("click", () => {
  reportForm.classList.remove("hidden");
  uploadForm.classList.add("hidden");
});

uploadBtn.addEventListener("click", () => {
  uploadForm.classList.remove("hidden");
  reportForm.classList.add("hidden");
});

reportForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (isReportSubmitting) {
    return;
  }

  isReportSubmitting = true;
  reportSubmitBtn.disabled = true;
  document.getElementById("formStatus").textContent = "در حال ارسال گزارش...";

  const params = new URLSearchParams({
    technician: document.getElementById("technician").value,
    technician_assistant: document.getElementById("technician_assistant").value,
    task: document.getElementById("task").value,
    activity: document.getElementById("activity").value,
    device_details: document.getElementById("device_details").value,
    date: document.getElementById("date").value,
    employee_id: document.getElementById("employee_id").value,
    base: selectedBase
  });

  fetch(`${SHEET_URL}?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  })
    .then((res) => res.text())
    .then((responseText) => {
      document.getElementById("formStatus").textContent = `✅ ${responseText}`;
      this.reset();

      const savedName = localStorage.getItem("technician_name") || localStorage.getItem("technician_username");
      const savedId = localStorage.getItem("technician_id") || localStorage.getItem("technician_username");
      document.getElementById("technician").value = savedName;
      document.getElementById("employee_id").value = savedId;
      document.getElementById("employee_id").readOnly = true;
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("formStatus").textContent = "❌ خطا در ارسال.";
    })
    .finally(() => {
      isReportSubmitting = false;
      reportSubmitBtn.disabled = false;
    });
});

uploadForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const files = Array.from(this.media.files);
  const caption = document.getElementById("caption").value.trim();
  const uploadTechnician = document.getElementById("uploadTechnician").value.trim();
  const uploadTechnicianAssistant = document.getElementById("uploadTechnicianAssistant").value.trim();
  const uploadDate = document.getElementById("uploadDate").value;
  if (!files.length) return;

  const formData = new FormData();
  const formattedCaption = buildUploadCaption({
    technician: uploadTechnician,
    technicianAssistant: uploadTechnicianAssistant,
    date: uploadDate,
    text: caption
  });
  const isSingleFile = files.length === 1;

  formData.append("chat_id", CHAT_ID);
  formData.append("message_thread_id", THREAD_ID);

  let endpoint = "";

  if (isSingleFile) {
    const file = files[0];
    const mediaField = file.type.startsWith("video/") ? "video" : "photo";
    endpoint = mediaField === "video" ? "sendVideo" : "sendPhoto";
    formData.append(mediaField, file);
    formData.append("caption", formattedCaption);
  } else {
    const mediaGroup = [];

    files.forEach((file, index) => {
      mediaGroup.push({
        type: file.type.startsWith("video/") ? "video" : "photo",
        media: `attach://${file.name}`,
        caption: index === 0 ? formattedCaption : undefined
      });
      formData.append(file.name, file);
    });

    endpoint = "sendMediaGroup";
    formData.append("media", JSON.stringify(mediaGroup));
  }

  document.getElementById("progressContainer").classList.remove("hidden");
  document.getElementById("cancelUploadBtn").classList.remove("hidden");
  const progressBar = document.getElementById("uploadProgress");
  const progressText = document.getElementById("progressText");

  xhr = new XMLHttpRequest();
  xhr.open("POST", `https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, true);

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      progressBar.value = percent;
      const sentMB = (event.loaded / 1024 / 1024).toFixed(1);
      const totalMB = (event.total / 1024 / 1024).toFixed(1);
      progressText.textContent = `📤 ارسال شده: ${sentMB} MB از ${totalMB} MB (${percent}%)`;
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      document.getElementById("uploadStatus").textContent = "✅ فایل‌ها موفقانه ارسال شدند.";
    } else {
      let errorMessage = "❌ خطا در ارسال فایل‌ها.";
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.description) {
          errorMessage = `❌ ${response.description}`;
        }
      } catch (error) {
        console.error(error);
      }
      document.getElementById("uploadStatus").textContent = errorMessage;
    }
    resetProgressUI();
  };

  xhr.onerror = function () {
    document.getElementById("uploadStatus").textContent = "❌ خطا در ارتباط.";
    resetProgressUI();
  };

  xhr.send(formData);
});

document.getElementById("cancelUploadBtn").addEventListener("click", function () {
  if (xhr) {
    xhr.abort();
    document.getElementById("uploadStatus").textContent = "⛔ ارسال فایل‌ها لغو شد.";
    resetProgressUI();
  }
});

memberForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const firstName = document.getElementById("memberFirstName").value.trim();
  const lastName = document.getElementById("memberLastName").value.trim();
  const memberId = document.getElementById("memberId").value.trim();
  const username = document.getElementById("memberUsername").value.trim();
  const password = document.getElementById("memberPassword").value.trim();

  if (!firstName || !lastName || !memberId || !username || !password) {
    memberStatus.textContent = "❌ همه فیلدها را وارد کنید.";
    return;
  }

  memberStatus.textContent = "در حال ذخیره اکانت...";

  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "addMember",
        firstName,
        lastName,
        memberId,
        username,
        password
      })
    });

    if (!response.ok) {
      throw new Error("Failed to save member");
    }

    const result = await response.json();
    memberStatus.textContent = result.message || "✅ اکانت جدید ذخیره شد.";
    memberForm.reset();
  } catch (error) {
    console.error(error);
    memberStatus.textContent = "❌ ذخیره اکانت در شیت ممکن نشد.";
  }
});

function resetProgressUI() {
  uploadForm.reset();
  document.getElementById("progressContainer").classList.add("hidden");
  document.getElementById("cancelUploadBtn").classList.add("hidden");
  document.getElementById("uploadProgress").value = 0;
  document.getElementById("progressText").textContent = "";
  setUploadFormDefaults(localStorage.getItem("technician_name") || localStorage.getItem("technician_username") || "");
}

function setUploadFormDefaults(displayName) {
  document.getElementById("uploadTechnician").value = displayName;
  document.getElementById("uploadDate").value = getTodayValue();
}

function buildUploadCaption({ technician, technicianAssistant, date, text }) {
  return [
    `تکنسین: ${technician || "-"}`,
    `تکنسین همراه: ${technicianAssistant || "-"}`,
    `تاریخ: ${date || "-"}`,
    `فعالیت انجام شده: ${text || "-"}`
  ].join("\n");
}

function getTodayValue() {
  return new Date().toISOString().split("T")[0];
}

function getInitialBase() {
  const requestedBase = urlParams.get("base");
  const savedBase = localStorage.getItem("selected_base");

  if (AVAILABLE_BASES.includes(requestedBase)) {
    return requestedBase;
  }

  if (AVAILABLE_BASES.includes(savedBase)) {
    return savedBase;
  }

  return "";
}

function populateBaseOptions() {
  AVAILABLE_BASES.forEach((baseName) => {
    const option = document.createElement("option");
    option.value = baseName;
    option.textContent = baseName;
    baseSelect.appendChild(option);
  });

  baseSelect.value = selectedBase;
}

function persistSelectedBase(baseName) {
  localStorage.setItem("selected_base", baseName);

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("base", baseName);
  window.history.replaceState({}, "", nextUrl);
}

function updateBaseDisplay() {
  selectedBaseDisplay.textContent = selectedBase ? `بیس انتخاب‌شده: ${selectedBase}` : "";
}

document.getElementById("date").value = getTodayValue();
document.getElementById("uploadDate").value = getTodayValue();

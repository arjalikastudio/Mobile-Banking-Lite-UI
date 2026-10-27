

    // ---------------------------
    // State + Storage
    // ---------------------------
    const STORAGE_KEY = "mblite_v2";

    const defaultState = {
      user: {
        name: "Nadia Putri",
        phone: "+62 812-0000-1234",
        email: "nadia@mail.com",
        kycLevel: "Verified",
        pinHint: "****", // demo
      },
      settings: {
        hideBalance: false,
        biometric: true,
        notifications: true,
        darkMode: false,      // mock UI only
        autoLogoutMin: 5,     // demo
        dailyTxLimit: 25000000
      },
      accounts: [
        { id: "acc_1", alias: "Utama", bank: "Bank Lite", number: "9876543210", balance: 12500000 },
      ],
      buckets: [
        { id: "b_1", name: "Tabungan Liburan", amount: 2500000 },
        { id: "b_2", name: "Dana Darurat", amount: 1500000 },
      ],
      tx: [
        { id:"t1", date:"2026-02-08", desc:"Top Up E-Wallet", amount:-150000, category:"Top Up" },
        { id:"t2", date:"2026-02-07", desc:"Gaji", amount: 8500000, category:"Income" },
        { id:"t3", date:"2026-02-05", desc:"Belanja Groceries", amount:-320000, category:"Spend" },
      ],
      cards: [
        {
          id:"c1",
          type:"Digital Debit",
          nameOnCard:"NADIA PUTRI",
          pan:"4987 1234 5678 9012",
          exp:"08/29",
          cvv:"123",
          frozen:false,
          showSensitive:false,
          controls: {
            online: true,
            international: false,
            contactless: true,
            dailyLimitEnabled: true,
            dailyLimit: 5000000
          }
        }
      ],
      loans: [
        { id:"l1", status:"Active", principal: 5000000, tenorMonths: 6, rateAnnual: 18, createdAt:"2026-01-15", paidMonths: 1 }
      ],
      notifications: [
        { id:"n1", date:"2026-02-09", title:"Keamanan", body:"Aktifkan biometrik untuk login lebih cepat.", read:false, type:"security" },
        { id:"n2", date:"2026-02-08", title:"Promo", body:"Cashback transfer BI-FAST (demo).", read:true, type:"promo" },
      ],
      drafts: {
        transfer: null // store step data for confirm screen
      }
    };

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(defaultState);
        const parsed = JSON.parse(raw);
        return mergeDeep(structuredClone(defaultState), parsed);
      } catch {
        return structuredClone(defaultState);
      }
    }
    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateNotifDot();
    }
    let state = loadState();

    // ---------------------------
    // Helpers
    // ---------------------------
    const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
    const byId = (id) => document.getElementById(id);

    function toast(msg) {
      const el = byId("toast");
      const txt = byId("toastText");
      txt.textContent = msg;
      el.classList.remove("hidden");
      clearTimeout(toast._t);
      toast._t = setTimeout(() => el.classList.add("hidden"), 1800);
    }

    function setTitle(title) {
      byId("topbarTitle").textContent = title;
      document.title = title + " — Mobile Banking Lite";
    }

    function activeNav(routeHash) {
      document.querySelectorAll(".navbtn").forEach(btn => {
        const r = btn.getAttribute("data-route");
        btn.classList.toggle("active", r === routeHash);
      });
    }

    function sumBalance() {
      return state.accounts.reduce((a, x) => a + (x.balance || 0), 0);
    }

    function render(html) {
      byId("viewRoot").innerHTML = html;
    }

    function updateNotifDot() {
      const hasUnread = state.notifications.some(n => !n.read);
      byId("notifDot").classList.toggle("hidden", !hasUnread);
    }

    // ---------------------------
    // Views
    // ---------------------------
    function viewDashboard() {
      setTitle("Dashboard");
      const total = sumBalance();
      const hide = state.settings.hideBalance;

      const acc = state.accounts[0];
      const recent = state.tx.slice(0, 5);

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm text-slate-500">Main Balance</div>
                <div class="mt-1 text-2xl font-bold tracking-tight">
                  ${hide ? "•••••••" : rupiah(total)}
                </div>
                <div class="mt-2 text-xs text-slate-500">
                  Rekening: <span class="font-medium text-slate-700">${acc.alias}</span> • ${maskAccount(acc.number)}
                </div>
              </div>
              <button class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98]" id="btnToggleBalance">
                ${hide ? eyeIcon("closed") : eyeIcon("open")}
              </button>
            </div>

            <!-- Primary quick actions -->
            <div class="mt-4 grid grid-cols-4 gap-2">
              ${quickAction("#/transfer", "Transfer", transferIcon())}
              ${quickAction("#/mutasi", "Mutasi", listIcon())}
              ${quickAction("#/rekening-baru", "Rekening", plusIcon())}
              ${quickAction("#/pinjaman", "Pinjaman", loanIcon())}
            </div>

            <!-- Extra quick actions like digital banks -->
            <div class="mt-2 grid grid-cols-4 gap-2">
              ${quickAction("#/topup", "Top Up", boltIcon())}
              ${quickAction("#/tagihan", "Tagihan", billIcon())}
              ${quickAction("#/qris", "QRIS", qrIcon())}
              ${quickAction("#/split", "Split", splitIcon())}
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Buckets</div>
              <button id="btnAddBucket" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Tambah</button>
            </div>
            <div class="mt-3 space-y-2">
              ${state.buckets.map(b => `
                <div class="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                  <div>
                    <div class="font-medium">${escapeHtml(b.name)}</div>
                    <div class="text-sm text-slate-500">${rupiah(b.amount)}</div>
                  </div>
                  <button class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200" data-bucket-del="${b.id}">Hapus</button>
                </div>
              `).join("") || `<div class="text-sm text-slate-500">Belum ada bucket.</div>`}
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Transaksi Terakhir</div>
              <a href="#/mutasi" class="text-sm text-slate-600 hover:text-slate-900">Lihat semua</a>
            </div>
            <div class="mt-3 space-y-2">
              ${recent.map(t => txRow(t)).join("")}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            ${miniPromo("Digital Card", "Buat & atur limit kartu digital.", "#/card")}
            ${miniPromo("Security Center", "PIN, limit, & auto logout.", "#/security")}
          </div>
        </section>
      `);

      byId("btnToggleBalance").onclick = () => {
        state.settings.hideBalance = !state.settings.hideBalance;
        saveState(); viewDashboard(); toast(state.settings.hideBalance ? "Balance disembunyikan" : "Balance ditampilkan");
      };

      byId("btnAddBucket").onclick = () => openBucketModal();

      document.querySelectorAll("[data-bucket-del]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-bucket-del");
          state.buckets = state.buckets.filter(b => b.id !== id);
          saveState(); viewDashboard(); toast("Bucket dihapus");
        };
      });
    }

    function viewNotifications() {
      setTitle("Notifikasi");
      // mark as read on open
      state.notifications = state.notifications.map(n => ({ ...n, read:true }));
      saveState();

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Inbox</div>
              <button id="btnSeedNotif" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Tambah</button>
            </div>

            <div class="mt-3 space-y-2" id="notifList">
              ${state.notifications.map(n => `
                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <div class="font-medium">${escapeHtml(n.title)}</div>
                    <span class="text-xs text-slate-500">${n.date}</span>
                  </div>
                  <div class="text-sm text-slate-600 mt-1">${escapeHtml(n.body)}</div>
                  <div class="mt-2 flex gap-2">
                    ${n.type === "security" ? `<a class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200" href="#/security">Buka</a>` : ``}
                    <button class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200" data-notif-del="${n.id}">Hapus</button>
                  </div>
                </div>
              `).join("") || `<div class="text-sm text-slate-500">Tidak ada notifikasi.</div>`}
            </div>
          </div>
        </section>
      `);

      byId("btnSeedNotif").onclick = () => {
        const samples = [
          { title:"Keamanan", body:"Perubahan PIN berhasil (demo).", type:"security" },
          { title:"Info", body:"Mutasi bulan ini siap di-export.", type:"info" },
          { title:"Promo", body:"Cashback top up (demo).", type:"promo" },
        ];
        const s = samples[Math.floor(Math.random()*samples.length)];
        state.notifications.unshift({ id:"n_" + cryptoRand(), date:new Date().toISOString().slice(0,10), read:false, ...s });
        saveState();
        toast("Notifikasi ditambahkan");
        viewNotifications();
      };

      document.querySelectorAll("[data-notif-del]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-notif-del");
          state.notifications = state.notifications.filter(n => n.id !== id);
          saveState();
          toast("Notifikasi dihapus");
          viewNotifications();
        };
      });
    }

    function viewAddAccount() {
      setTitle("Tambah Rekening Baru");
      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="text-sm text-slate-500">Tambahkan rekening untuk transfer / mutasi.</div>
            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Alias</div>
                <input id="accAlias" class="input" placeholder="Contoh: Gaji / Tabungan" />
              </div>
              <div>
                <div class="text-sm font-medium mb-1">Bank</div>
                <input id="accBank" class="input" placeholder="Contoh: Bank Jago / BCA / dll" />
              </div>
              <div>
                <div class="text-sm font-medium mb-1">No Rekening</div>
                <input id="accNo" class="input" inputmode="numeric" placeholder="10–16 digit" />
              </div>
              <div>
                <div class="text-sm font-medium mb-1">Saldo Awal</div>
                <input id="accBal" class="input" inputmode="numeric" placeholder="Contoh: 1000000" />
              </div>
              <button id="btnSaveAcc" class="btn btn-primary w-full">Simpan Rekening</button>
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Daftar Rekening</div>
              <button id="btnSeed" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Tambah Contoh</button>
            </div>
            <div class="mt-3 space-y-2">
              ${state.accounts.map(a => `
                <div class="rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div>
                    <div class="font-medium">${escapeHtml(a.alias)} <span class="text-xs text-slate-500">• ${escapeHtml(a.bank)}</span></div>
                    <div class="text-sm text-slate-500">${maskAccount(a.number)} • ${rupiah(a.balance)}</div>
                  </div>
                  ${a.id === "acc_1" ? `<span class="chip bg-slate-100 text-slate-700">Utama</span>` : `<button class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200" data-acc-del="${a.id}">Hapus</button>`}
                </div>
              `).join("")}
            </div>
          </div>
        </section>
      `);

      byId("btnSaveAcc").onclick = () => {
        const alias = byId("accAlias").value.trim();
        const bank = byId("accBank").value.trim();
        const number = byId("accNo").value.trim();
        const bal = parseInt(byId("accBal").value.trim() || "0", 10);

        if (!alias || !bank || !number) return toast("Lengkapi data rekening");
        if (!/^\d{10,16}$/.test(number)) return toast("No rekening harus 10–16 digit");

        const newAcc = { id: "acc_" + cryptoRand(), alias, bank, number, balance: isNaN(bal) ? 0 : bal };
        state.accounts.push(newAcc);
        saveState();
        location.hash = "#/dashboard";
        toast("Rekening ditambahkan");
      };

      byId("btnSeed").onclick = () => {
        state.accounts.push({ id:"acc_" + cryptoRand(), alias:"Gaji", bank:"Bank Contoh", number:"123456789012", balance: 3200000 });
        saveState(); viewAddAccount(); toast("Contoh rekening ditambahkan");
      };

      document.querySelectorAll("[data-acc-del]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-acc-del");
          state.accounts = state.accounts.filter(a => a.id !== id);
          saveState(); viewAddAccount(); toast("Rekening dihapus");
        };
      });
    }

    function viewLoan() {
      setTitle("Pengajuan Pinjaman");
      const activeLoan = state.loans.find(l => l.status === "Active");

      render(`
        <section class="space-y-4">
          ${activeLoan ? `
            <div class="card p-4">
              <div class="flex items-center justify-between">
                <div class="font-semibold">Pinjaman Aktif</div>
                <span class="chip bg-emerald-100 text-emerald-800">${activeLoan.status}</span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="text-xs text-slate-500">Pokok</div>
                  <div class="font-semibold">${rupiah(activeLoan.principal)}</div>
                </div>
                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="text-xs text-slate-500">Tenor</div>
                  <div class="font-semibold">${activeLoan.tenorMonths} bulan</div>
                </div>
                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="text-xs text-slate-500">Bunga (p.a.)</div>
                  <div class="font-semibold">${activeLoan.rateAnnual}%</div>
                </div>
                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="text-xs text-slate-500">Terbayar</div>
                  <div class="font-semibold">${activeLoan.paidMonths || 0}/${activeLoan.tenorMonths} bulan</div>
                </div>
              </div>

              <div class="mt-3 rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Estimasi cicilan/bulan</div>
                <div class="text-lg font-bold">${rupiah(calcLoanMonthly(activeLoan.principal, activeLoan.tenorMonths, activeLoan.rateAnnual))}</div>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-2">
                <button id="btnPayMock" class="btn btn-ghost">Bayar Cicilan</button>
                <button id="btnLoanDetail" class="btn btn-primary">Detail</button>
              </div>
            </div>
          ` : `
            <div class="card p-4">
              <div class="font-semibold">Ajukan Pinjaman</div>
              <div class="text-sm text-slate-500 mt-1">Simulasi sederhana ala digital banking.</div>

              <div class="mt-4 space-y-3">
                <div>
                  <div class="text-sm font-medium mb-1">Jumlah Pinjaman</div>
                  <input id="loanAmount" class="input" inputmode="numeric" placeholder="Contoh: 5000000" />
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Tenor (bulan)</div>
                  <select id="loanTenor" class="input">
                    <option value="3">3</option>
                    <option value="6" selected>6</option>
                    <option value="12">12</option>
                  </select>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Bunga per tahun</div>
                  <input id="loanRate" class="input" inputmode="numeric" value="18" />
                </div>

                <div class="rounded-2xl border border-slate-200 p-3">
                  <div class="text-xs text-slate-500">Estimasi cicilan/bulan</div>
                  <div class="text-lg font-bold" id="loanMonthly">—</div>
                  <div class="text-xs text-slate-500 mt-1">*Estimasi flat (demo)</div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button id="btnLoanCalc" class="btn btn-ghost">Hitung</button>
                  <button id="btnLoanSubmit" class="btn btn-primary">Ajukan</button>
                </div>
              </div>
            </div>
          `}

          <div class="card p-4">
            <div class="font-semibold">Riwayat Pinjaman</div>
            <div class="mt-3 space-y-2">
              ${state.loans.map(l => `
                <div class="rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
                  <div>
                    <div class="font-medium">${rupiah(l.principal)} • ${l.tenorMonths} bln</div>
                    <div class="text-sm text-slate-500">${l.createdAt}</div>
                  </div>
                  <span class="chip ${l.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}">${l.status}</span>
                </div>
              `).join("") || `<div class="text-sm text-slate-500">Belum ada pinjaman.</div>`}
            </div>
          </div>
        </section>
      `);

      if (activeLoan) {
        byId("btnPayMock").onclick = () => openPayLoanModal(activeLoan);
        byId("btnLoanDetail").onclick = () => openLoanDetailModal(activeLoan);
        return;
      }

      const calcShow = () => {
        const amount = parseInt((byId("loanAmount")?.value || "0").trim(), 10);
        const tenor = parseInt(byId("loanTenor")?.value || "6", 10);
        const rate = parseFloat(byId("loanRate")?.value || "18");
        if (!amount || isNaN(amount) || amount <= 0) return "—";
        return rupiah(calcLoanMonthly(amount, tenor, isNaN(rate) ? 18 : rate));
      };

      byId("btnLoanCalc").onclick = () => byId("loanMonthly").textContent = calcShow();

      byId("btnLoanSubmit").onclick = () => {
        const amount = parseInt((byId("loanAmount").value || "0").trim(), 10);
        const tenor = parseInt(byId("loanTenor").value, 10);
        const rate = parseFloat(byId("loanRate").value);
        if (!amount || isNaN(amount) || amount <= 0) return toast("Masukkan jumlah pinjaman valid");

        state.loans.unshift({
          id:"l_" + cryptoRand(),
          status:"Active",
          principal: amount,
          tenorMonths: tenor,
          rateAnnual: isNaN(rate) ? 18 : rate,
          createdAt: new Date().toISOString().slice(0,10),
          paidMonths: 0
        });
        saveState();
        toast("Pengajuan dikirim");
        viewLoan();
      };
    }

    function viewTransferSim() {
      setTitle("Simulasi Transfer Dana");
      const accountsOpt = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.alias)} • ${maskAccount(a.number)}</option>`).join("");

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Transfer</div>
            <div class="text-sm text-slate-500 mt-1">Isi data, lalu konfirmasi transfer (demo).</div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Dari Rekening</div>
                <select id="trFrom" class="input">${accountsOpt}</select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="text-sm font-medium mb-1">Metode</div>
                  <select id="trMethod" class="input">
                    <option value="BI-FAST" selected>BI-FAST</option>
                    <option value="Online">Online Transfer</option>
                    <option value="SKN">SKN</option>
                  </select>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Tujuan Bank</div>
                  <input id="trBank" class="input" placeholder="Contoh: BCA" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="text-sm font-medium mb-1">No Tujuan</div>
                  <input id="trTo" class="input" inputmode="numeric" placeholder="10–16 digit" />
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Nominal</div>
                  <input id="trAmt" class="input" inputmode="numeric" placeholder="Contoh: 250000" />
                </div>
              </div>

              <div>
                <div class="text-sm font-medium mb-1">Catatan</div>
                <input id="trNote" class="input" placeholder="Opsional" />
              </div>

              <div class="rounded-2xl border border-slate-200 p-3 space-y-1">
                <div class="flex justify-between text-sm"><span class="text-slate-500">Biaya admin</span><span id="fee">—</span></div>
                <div class="flex justify-between text-sm"><span class="text-slate-500">Total debit</span><span id="debit">—</span></div>
                <div class="flex justify-between text-sm"><span class="text-slate-500">Estimasi diterima</span><span class="font-semibold" id="recv">—</span></div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button id="btnSim" class="btn btn-ghost">Simulasikan</button>
                <button id="btnConfirm" class="btn btn-primary">Lanjut</button>
              </div>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Tips Keamanan</div>
            <ul class="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-1">
              <li>Pastikan nama penerima sesuai sebelum transfer.</li>
              <li>Jangan bagikan OTP/PIN.</li>
              <li>Aktifkan biometrik di Settings.</li>
            </ul>
          </div>
        </section>
      `);

      function calcFee(method) {
        if (method === "BI-FAST") return 2500;
        if (method === "Online") return 6500;
        if (method === "SKN") return 2900;
        return 0;
      }

      function simulate() {
        const method = byId("trMethod").value;
        const amt = parseInt((byId("trAmt").value || "0").trim(), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
          byId("fee").textContent = "—"; byId("debit").textContent="—"; byId("recv").textContent="—"; return;
        }
        const fee = calcFee(method);
        byId("fee").textContent = rupiah(fee);
        byId("debit").textContent = rupiah(amt + fee);
        byId("recv").textContent = rupiah(amt);
      }

      byId("btnSim").onclick = simulate;
      ["trMethod","trAmt"].forEach(id => byId(id).addEventListener("input", simulate));

      byId("btnConfirm").onclick = () => {
        const fromId = byId("trFrom").value;
        const method = byId("trMethod").value;
        const bank = byId("trBank").value.trim();
        const to = byId("trTo").value.trim();
        const amt = parseInt((byId("trAmt").value || "0").trim(), 10);
        const note = byId("trNote").value.trim();

        if (!bank || !to || !amt) return toast("Lengkapi data transfer");
        if (!/^\d{10,16}$/.test(to)) return toast("No tujuan harus 10–16 digit");
        if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");

        const fee = calcFee(method);
        const total = amt + fee;

        // daily limit (demo)
        if (total > state.settings.dailyTxLimit) return toast("Melebihi limit harian (demo)");

        const fromAcc = state.accounts.find(a => a.id === fromId);
        if (!fromAcc) return toast("Rekening asal tidak ditemukan");
        if (fromAcc.balance < total) return toast("Saldo tidak cukup");

        state.drafts.transfer = {
          fromId, method, bank, to, amt, fee, total, note,
          createdAt: new Date().toISOString().slice(0,10)
        };
        saveState();
        location.hash = "#/transfer-confirm";
      };
    }

    function viewTransferConfirm() {
      setTitle("Konfirmasi Transfer");
      const d = state.drafts.transfer;
      if (!d) {
        render(`
          <div class="card p-6 text-center">
            <div class="font-semibold">Draft tidak ditemukan</div>
            <div class="text-sm text-slate-500 mt-1">Silakan isi ulang transfer.</div>
            <a href="#/transfer" class="inline-block btn btn-primary mt-4">Kembali</a>
          </div>
        `);
        return;
      }
      const fromAcc = state.accounts.find(a => a.id === d.fromId);

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Periksa Detail</div>
            <div class="mt-3 space-y-2">
              ${kvRow("Dari", `${fromAcc ? fromAcc.alias : "—"} • ${fromAcc ? maskAccount(fromAcc.number) : ""}`)}
              ${kvRow("Metode", d.method)}
              ${kvRow("Bank Tujuan", d.bank)}
              ${kvRow("No Tujuan", maskAccount(d.to))}
              ${kvRow("Nominal", rupiah(d.amt))}
              ${kvRow("Biaya", rupiah(d.fee))}
              ${kvRow("Total Debit", rupiah(d.total))}
              ${d.note ? kvRow("Catatan", d.note) : ""}
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <button id="btnEdit" class="btn btn-ghost">Ubah</button>
              <button id="btnSend" class="btn btn-primary">Kirim</button>
            </div>

            <div class="text-xs text-slate-500 mt-3">
              *Demo: setelah “Kirim”, saldo berkurang dan transaksi tercatat.
            </div>
          </div>
        </section>
      `);

      byId("btnEdit").onclick = () => location.hash = "#/transfer";

      byId("btnSend").onclick = () => {
        const fromAcc = state.accounts.find(a => a.id === d.fromId);
        if (!fromAcc) return toast("Rekening asal tidak ditemukan");
        if (fromAcc.balance < d.total) return toast("Saldo tidak cukup");

        fromAcc.balance -= d.total;
        state.tx.unshift({
          id: "t_" + cryptoRand(),
          date: new Date().toISOString().slice(0,10),
          desc: `Transfer ${d.method} ke ${d.bank} (${maskAccount(d.to)})${d.note ? " • " + d.note : ""}`,
          amount: -d.total,
          category: "Transfer"
        });

        state.notifications.unshift({
          id:"n_" + cryptoRand(),
          date:new Date().toISOString().slice(0,10),
          title:"Transfer Berhasil",
          body:`Transfer ${rupiah(d.amt)} ke ${d.bank} (${maskAccount(d.to)}) sukses (demo).`,
          read:false,
          type:"info"
        });

        state.drafts.transfer = null;
        saveState();
        toast("Transfer berhasil");
        location.hash = "#/dashboard";
      };
    }

    function viewMutasi() {
      setTitle("Mutasi Rekening");

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Filter</div>
              <button id="btnSeedTx" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Tambah Data</button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <select id="fCat" class="input">
                <option value="">Semua Kategori</option>
                <option>Transfer</option>
                <option>Top Up</option>
                <option>Income</option>
                <option>Spend</option>
                <option>Bill</option>
                <option>Loan</option>
              </select>
              <select id="fSign" class="input">
                <option value="">Masuk & Keluar</option>
                <option value="in">Masuk</option>
                <option value="out">Keluar</option>
              </select>
            </div>

            <div class="mt-2">
              <input id="fSearch" class="input" placeholder="Cari deskripsi..." />
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <button id="btnApply" class="btn btn-ghost">Terapkan</button>
              <button id="btnClear" class="btn btn-primary">Reset</button>
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Daftar Mutasi</div>
              <button id="btnExport" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Export</button>
            </div>

            <div class="mt-3 space-y-2" id="txList"></div>
          </div>
        </section>
      `);

      const listEl = byId("txList");

      function apply() {
        const cat = byId("fCat").value.trim();
        const sign = byId("fSign").value.trim();
        const q = byId("fSearch").value.trim().toLowerCase();

        let items = [...state.tx];
        if (cat) items = items.filter(t => t.category === cat);
        if (sign === "in") items = items.filter(t => t.amount > 0);
        if (sign === "out") items = items.filter(t => t.amount < 0);
        if (q) items = items.filter(t => (t.desc || "").toLowerCase().includes(q));

        listEl.innerHTML = items.map(txRow).join("") || `<div class="text-sm text-slate-500">Tidak ada transaksi.</div>`;
        apply._last = items;
      }

      byId("btnApply").onclick = () => apply();
      byId("btnClear").onclick = () => { byId("fCat").value=""; byId("fSign").value=""; byId("fSearch").value=""; apply(); toast("Filter direset"); };

      byId("btnSeedTx").onclick = () => {
        const samples = [
          { desc:"Tarik Tunai", amount:-200000, category:"Spend" },
          { desc:"Transfer masuk dari Raka", amount: 400000, category:"Income" },
          { desc:"Langganan Streaming", amount:-59000, category:"Spend" },
          { desc:"Top Up Game", amount:-75000, category:"Top Up" },
        ];
        const s = samples[Math.floor(Math.random()*samples.length)];
        state.tx.unshift({ id:"t_" + cryptoRand(), date:new Date().toISOString().slice(0,10), ...s });
        saveState(); apply(); toast("Transaksi contoh ditambahkan");
      };

      byId("btnExport").onclick = () => {
        const items = apply._last || [...state.tx];
        openExportModal(items);
      };

      apply();
    }

    function viewCard() {
      setTitle("Digital Card");
      const card = state.cards[0];

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Kartu Digital</div>
              <span class="chip ${card.frozen ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}">
                ${card.frozen ? "Frozen" : "Active"}
              </span>
            </div>

            <div class="mt-3 rounded-[1.5rem] p-4 bg-slate-900 text-white shadow-soft">
              <div class="flex items-center justify-between">
                <div class="text-sm opacity-80">${escapeHtml(card.type)}</div>
                <div class="text-sm opacity-80">VISA</div>
              </div>

              <div class="mt-6 text-lg font-semibold tracking-widest">
                ${card.showSensitive ? card.pan : maskPan(card.pan)}
              </div>

              <div class="mt-4 flex items-center justify-between text-sm">
                <div>
                  <div class="opacity-70 text-xs">Nama</div>
                  <div class="font-medium">${escapeHtml(card.nameOnCard)}</div>
                </div>
                <div class="text-right">
                  <div class="opacity-70 text-xs">Exp / CVV</div>
                  <div class="font-medium">
                    ${card.showSensitive ? `${card.exp} / ${card.cvv}` : `${card.exp} / •••`}
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <button id="btnToggleSensitive" class="btn btn-ghost">${card.showSensitive ? "Sembunyikan" : "Tampilkan"} Detail</button>
              <button id="btnFreeze" class="btn btn-primary">${card.frozen ? "Unfreeze" : "Freeze"}</button>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2">
              <button id="btnCopyPan" class="btn btn-ghost">Copy No Kartu</button>
              <button id="btnNewCard" class="btn btn-ghost">Buat Kartu Baru</button>
            </div>
          </div>

          <div class="card p-4">
            <div class="flex items-center justify-between">
              <div class="font-semibold">Kontrol Kartu</div>
              <a href="#/card-limit" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Atur Limit</a>
            </div>

            <div class="mt-3 space-y-2">
              ${toggleRow("Online Transaction", card.controls.online, "card_online")}
              ${toggleRow("International", card.controls.international, "card_international")}
              ${toggleRow("Contactless", card.controls.contactless, "card_contactless")}
              ${toggleRow("Limit Harian", card.controls.dailyLimitEnabled, "card_dailyLimitEnabled")}
            </div>

            <div class="mt-3 rounded-2xl border border-slate-200 p-3">
              <div class="text-xs text-slate-500">Limit harian kartu</div>
              <div class="font-semibold">${rupiah(card.controls.dailyLimit)}</div>
              <div class="text-xs text-slate-500 mt-1">${card.controls.dailyLimitEnabled ? "Aktif" : "Nonaktif"}</div>
            </div>
          </div>
        </section>
      `);

      byId("btnToggleSensitive").onclick = () => {
        card.showSensitive = !card.showSensitive;
        saveState(); viewCard();
      };
      byId("btnFreeze").onclick = () => {
        card.frozen = !card.frozen;
        saveState(); viewCard(); toast(card.frozen ? "Kartu di-freeze" : "Kartu aktif");
      };
      byId("btnCopyPan").onclick = async () => {
        try {
          await navigator.clipboard.writeText(card.pan.replaceAll(" ", ""));
          toast("No kartu dicopy");
        } catch {
          toast("Gagal copy (izin clipboard)");
        }
      };
      byId("btnNewCard").onclick = () => {
        const newPan = "4987 " + rnd4() + " " + rnd4() + " " + rnd4();
        const newCvv = String(Math.floor(100 + Math.random()*900));
        const newExp = String(String(Math.floor(1 + Math.random()*12)).padStart(2,"0")) + "/2" + String(Math.floor(7 + Math.random()*3));
        state.cards[0] = { ...card, pan:newPan, cvv:newCvv, exp:newExp, frozen:false, showSensitive:false };
        saveState(); viewCard(); toast("Kartu baru dibuat");
      };

      // card toggle handlers
      document.querySelectorAll("[data-toggle-key]").forEach(el => {
        el.onclick = () => {
          const key = el.getAttribute("data-toggle-key");
          if (!key) return;
          const c = state.cards[0];
          const map = {
            "card_online": "online",
            "card_international": "international",
            "card_contactless": "contactless",
            "card_dailyLimitEnabled": "dailyLimitEnabled"
          };
          const prop = map[key];
          c.controls[prop] = !c.controls[prop];
          saveState();
          viewCard();
          toast("Kontrol kartu diupdate");
        };
      });
    }

    function viewCardLimit() {
      setTitle("Atur Limit Kartu");
      const card = state.cards[0];

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Limit Harian</div>
            <div class="text-sm text-slate-500 mt-1">Affect transaksi kartu (demo).</div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Limit (Rp)</div>
                <input id="limVal" class="input" inputmode="numeric" value="${card.controls.dailyLimit}" />
              </div>

              <div class="rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Status</div>
                <div class="font-semibold">${card.controls.dailyLimitEnabled ? "Aktif" : "Nonaktif"}</div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button id="btnBack" class="btn btn-ghost">Kembali</button>
                <button id="btnSave" class="btn btn-primary">Simpan</button>
              </div>
            </div>
          </div>
        </section>
      `);

      byId("btnBack").onclick = () => history.back();
      byId("btnSave").onclick = () => {
        const v = parseInt((byId("limVal").value || "0").trim(), 10);
        if (!v || isNaN(v) || v <= 0) return toast("Limit tidak valid");
        state.cards[0].controls.dailyLimit = v;
        saveState();
        toast("Limit tersimpan");
        location.hash = "#/card";
      };
    }

    function viewTopUp() {
      setTitle("Top Up");
      const accountsOpt = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.alias)} • ${maskAccount(a.number)}</option>`).join("");

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Top Up E-Wallet</div>
            <div class="text-sm text-slate-500 mt-1">Catat transaksi & kurangi saldo (demo).</div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Dari Rekening</div>
                <select id="tuFrom" class="input">${accountsOpt}</select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="text-sm font-medium mb-1">Provider</div>
                  <select id="tuProv" class="input">
                    <option>DANA</option>
                    <option>OVO</option>
                    <option>GoPay</option>
                    <option>ShopeePay</option>
                  </select>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">No HP</div>
                  <input id="tuPhone" class="input" inputmode="numeric" placeholder="08xxxxxxxxxx" />
                </div>
              </div>

              <div>
                <div class="text-sm font-medium mb-1">Nominal</div>
                <input id="tuAmt" class="input" inputmode="numeric" placeholder="Contoh: 100000" />
              </div>

              <button id="btnTopUp" class="btn btn-primary w-full">Top Up</button>
            </div>
          </div>
        </section>
      `);

      byId("btnTopUp").onclick = () => {
        const fromId = byId("tuFrom").value;
        const prov = byId("tuProv").value;
        const phone = byId("tuPhone").value.trim();
        const amt = parseInt((byId("tuAmt").value || "0").trim(), 10);
        if (!phone || phone.length < 9) return toast("Nomor HP tidak valid");
        if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");
        const acc = state.accounts.find(a => a.id === fromId);
        if (!acc) return toast("Rekening tidak ditemukan");
        if (acc.balance < amt) return toast("Saldo tidak cukup");

        acc.balance -= amt;
        state.tx.unshift({
          id:"t_" + cryptoRand(),
          date:new Date().toISOString().slice(0,10),
          desc:`Top Up ${prov} (${maskPhone(phone)})`,
          amount:-amt,
          category:"Top Up"
        });
        saveState();
        toast("Top up berhasil");
        location.hash = "#/dashboard";
      };
    }

    function viewBills() {
      setTitle("Tagihan");
      const accountsOpt = state.accounts.map(a => `<option value="${a.id}">${escapeHtml(a.alias)} • ${maskAccount(a.number)}</option>`).join("");

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Bayar Tagihan</div>
            <div class="text-sm text-slate-500 mt-1">PLN/PDAM/Internet (demo).</div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Dari Rekening</div>
                <select id="biFrom" class="input">${accountsOpt}</select>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="text-sm font-medium mb-1">Jenis</div>
                  <select id="biType" class="input">
                    <option>PLN</option>
                    <option>PDAM</option>
                    <option>Internet</option>
                    <option>BPJS</option>
                  </select>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">ID Pelanggan</div>
                  <input id="biId" class="input" placeholder="Contoh: 1234567890" />
                </div>
              </div>

              <div>
                <div class="text-sm font-medium mb-1">Nominal</div>
                <input id="biAmt" class="input" inputmode="numeric" placeholder="Contoh: 250000" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button id="btnBillCheck" class="btn btn-ghost">Cek</button>
                <button id="btnBillPay" class="btn btn-primary">Bayar</button>
              </div>

              <div id="billResult" class="hidden rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Detail</div>
                <div class="font-semibold mt-1" id="billTitle">—</div>
                <div class="text-sm text-slate-500" id="billSub">—</div>
              </div>
            </div>
          </div>
        </section>
      `);

      const show = (type, id, amt) => {
        byId("billTitle").textContent = `${type} • ${id}`;
        byId("billSub").textContent = `Tagihan ${rupiah(amt)} (demo)`;
        byId("billResult").classList.remove("hidden");
      };

      byId("btnBillCheck").onclick = () => {
        const type = byId("biType").value;
        const id = byId("biId").value.trim();
        const amt = parseInt((byId("biAmt").value || "0").trim(), 10);
        if (!id) return toast("ID pelanggan wajib");
        if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");
        show(type, id, amt);
        toast("Tagihan ditemukan (demo)");
      };

      byId("btnBillPay").onclick = () => {
        const fromId = byId("biFrom").value;
        const type = byId("biType").value;
        const id = byId("biId").value.trim();
        const amt = parseInt((byId("biAmt").value || "0").trim(), 10);
        if (!id) return toast("ID pelanggan wajib");
        if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");

        const acc = state.accounts.find(a => a.id === fromId);
        if (!acc) return toast("Rekening tidak ditemukan");
        if (acc.balance < amt) return toast("Saldo tidak cukup");

        acc.balance -= amt;
        state.tx.unshift({
          id:"t_" + cryptoRand(),
          date:new Date().toISOString().slice(0,10),
          desc:`Bayar ${type} (${id})`,
          amount:-amt,
          category:"Bill"
        });
        state.notifications.unshift({
          id:"n_" + cryptoRand(),
          date:new Date().toISOString().slice(0,10),
          title:"Tagihan Dibayar",
          body:`Pembayaran ${type} sebesar ${rupiah(amt)} berhasil (demo).`,
          read:false,
          type:"info"
        });
        saveState();
        toast("Pembayaran berhasil");
        location.hash = "#/dashboard";
      };
    }

    function viewQRIS() {
      setTitle("QRIS");
      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">QRIS Pay</div>
            <div class="text-sm text-slate-500 mt-1">Demo tampilan (tanpa kamera).</div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <button id="btnShowMyQR" class="btn btn-primary">Tampilkan QR</button>
              <button id="btnScanMock" class="btn btn-ghost">Scan (mock)</button>
            </div>

            <div id="qrBox" class="hidden mt-4 rounded-2xl border border-slate-200 p-4 text-center">
              <div class="mx-auto w-44 h-44 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <div class="text-slate-500 text-sm">QR Placeholder</div>
              </div>
              <div class="mt-3 text-sm text-slate-600">Nama: <span class="font-semibold">${escapeHtml(state.user.name)}</span></div>
              <div class="text-xs text-slate-500 mt-1">*Ini demo UI.</div>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Riwayat QR</div>
            <div class="text-sm text-slate-500 mt-2">Gunakan Mutasi untuk lihat transaksi.</div>
            <a href="#/mutasi" class="inline-block btn btn-ghost mt-3">Buka Mutasi</a>
          </div>
        </section>
      `);

      byId("btnShowMyQR").onclick = () => {
        byId("qrBox").classList.toggle("hidden");
      };

      byId("btnScanMock").onclick = () => {
        openModal({
          title: "Scan QR (Demo)",
          bodyHtml: `
            <div class="text-sm text-slate-600">
              Simulasi scan: masukkan nominal untuk pembayaran.
            </div>
            <div class="mt-3">
              <div class="text-sm font-medium mb-1">Nominal</div>
              <input id="qAmt" class="input" inputmode="numeric" placeholder="Contoh: 25000" />
            </div>
          `,
          primaryText: "Bayar",
          onPrimary: () => {
            const amt = parseInt((byId("qAmt").value || "0").trim(), 10);
            if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");
            const acc = state.accounts[0];
            if (acc.balance < amt) return toast("Saldo tidak cukup");

            acc.balance -= amt;
            state.tx.unshift({
              id:"t_" + cryptoRand(),
              date:new Date().toISOString().slice(0,10),
              desc:`QRIS Payment (Merchant Demo)`,
              amount:-amt,
              category:"Spend"
            });
            saveState();
            closeModal();
            toast("Pembayaran QRIS berhasil");
            location.hash = "#/dashboard";
          }
        });
      };
    }

    function viewSplitBill() {
      setTitle("Split Bill");
      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Split Bill</div>
            <div class="text-sm text-slate-500 mt-1">Buat link/tagihan split (demo).</div>

            <div class="mt-4 space-y-3">
              <div>
                <div class="text-sm font-medium mb-1">Deskripsi</div>
                <input id="spDesc" class="input" placeholder="Contoh: Makan bareng" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="text-sm font-medium mb-1">Total</div>
                  <input id="spTotal" class="input" inputmode="numeric" placeholder="Contoh: 200000" />
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Orang</div>
                  <input id="spPeople" class="input" inputmode="numeric" placeholder="Contoh: 4" />
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Per orang</div>
                <div class="text-lg font-bold" id="spEach">—</div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button id="btnSpCalc" class="btn btn-ghost">Hitung</button>
                <button id="btnSpCreate" class="btn btn-primary">Buat</button>
              </div>

              <div id="spLinkBox" class="hidden rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Link (demo)</div>
                <div class="font-semibold break-all" id="spLink">—</div>
                <button id="btnCopyLink" class="btn btn-ghost w-full mt-3">Copy Link</button>
              </div>
            </div>
          </div>
        </section>
      `);

      const compute = () => {
        const total = parseInt((byId("spTotal").value || "0").trim(), 10);
        const people = parseInt((byId("spPeople").value || "0").trim(), 10);
        if (!total || !people || isNaN(total) || isNaN(people) || total <= 0 || people <= 0) return null;
        return Math.ceil(total / people);
      };

      byId("btnSpCalc").onclick = () => {
        const each = compute();
        byId("spEach").textContent = each ? rupiah(each) : "—";
      };

      byId("btnSpCreate").onclick = () => {
        const desc = byId("spDesc").value.trim() || "Split Bill";
        const each = compute();
        if (!each) return toast("Isi total & orang valid");
        const link = `https://pay.demo/split/${cryptoRand()}?each=${each}`;
        byId("spLink").textContent = `${desc} • ${link}`;
        byId("spLinkBox").classList.remove("hidden");
        toast("Split bill dibuat (demo)");
      };

      byId("btnCopyLink").onclick = async () => {
        try {
          await navigator.clipboard.writeText(byId("spLink").textContent);
          toast("Link dicopy");
        } catch {
          toast("Gagal copy");
        }
      };
    }

    function viewProfile() {
      setTitle("Profile");
      const u = state.user;

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
                ${initials(u.name)}
              </div>
              <div class="flex-1">
                <div class="text-lg font-semibold">${escapeHtml(u.name)}</div>
                <div class="text-sm text-slate-500">${escapeHtml(u.email)}</div>
              </div>
              <span class="chip bg-emerald-100 text-emerald-800">${escapeHtml(u.kycLevel)}</span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <a href="#/setting" class="btn btn-ghost text-center">Settings</a>
              <button id="btnLogout" class="btn btn-primary">Logout</button>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Data Akun</div>
            <div class="mt-3 space-y-3">
              ${kvRow("Nomor HP", u.phone)}
              ${kvRow("Email", u.email)}
              ${kvRow("Level KYC", u.kycLevel)}
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Menu</div>
            <div class="mt-3 space-y-2">
              ${menuLink("Tambah Rekening Baru", "#/rekening-baru")}
              ${menuLink("Pengajuan Pinjaman", "#/pinjaman")}
              ${menuLink("Digital Card", "#/card")}
              ${menuLink("Security Center", "#/security")}
              ${menuLink("Notifikasi", "#/notif")}
            </div>
          </div>
        </section>
      `);

      byId("btnLogout").onclick = () => {
        openModal({
          title: "Logout",
          bodyHtml: `<div class="text-sm text-slate-600">Keluar dari aplikasi? (demo)</div>`,
          primaryText: "Logout",
          onPrimary: () => { closeModal(); toast("Logout (demo)"); location.hash = "#/dashboard"; }
        });
      };
    }

    function viewSetting() {
      setTitle("Setting");
      const s = state.settings;

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">Keamanan</div>
            <div class="mt-3 space-y-2">
              ${toggleRow("Biometric Login", s.biometric, "set_biometric")}
              ${toggleRow("Notifikasi", s.notifications, "set_notifications")}
              ${toggleRow("Sembunyikan Balance", s.hideBalance, "set_hideBalance")}
            </div>
            <a href="#/security" class="inline-block btn btn-ghost w-full mt-3">Buka Security Center</a>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Preferensi</div>
            <div class="mt-3 space-y-2">
              ${toggleRow("Dark Mode (mock)", s.darkMode, "set_darkMode")}
              <div class="rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div class="font-medium">Reset Data Demo</div>
                  <div class="text-sm text-slate-500">Kembalikan state seperti awal.</div>
                </div>
                <button id="btnReset" class="text-sm px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200">Reset</button>
              </div>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Tentang</div>
            <div class="text-sm text-slate-500 mt-2">
              SPA demo untuk konsep “lite digital banking”. Data disimpan di <span class="font-medium">localStorage</span>.
            </div>
          </div>
        </section>
      `);

      document.querySelectorAll("[data-toggle-key]").forEach(el => {
        el.onclick = () => {
          const key = el.getAttribute("data-toggle-key");
          if (!key) return;
          const name = key.replace("set_", "");
          state.settings[name] = !state.settings[name];
          saveState();
          viewSetting();
          toast("Setting diupdate");
        };
      });

      byId("btnReset").onclick = () => {
        openModal({
          title: "Reset Data",
          bodyHtml: `<div class="text-sm text-slate-600">Reset semua data demo? Ini akan menghapus perubahan rekening, transaksi, dll.</div>`,
          primaryText: "Reset",
          onPrimary: () => {
            state = structuredClone(defaultState);
            saveState();
            closeModal();
            toast("Data direset");
            location.hash = "#/dashboard";
          }
        });
      };
    }

    function viewSecurity() {
      setTitle("Security Center");
      const s = state.settings;

      render(`
        <section class="space-y-4">
          <div class="card p-4">
            <div class="font-semibold">PIN & Login</div>
            <div class="mt-3 space-y-2">
              <button id="btnChangePin" class="w-full rounded-2xl border border-slate-200 p-3 flex items-center justify-between hover:bg-slate-50">
                <div class="text-left">
                  <div class="font-medium">Ubah PIN</div>
                  <div class="text-sm text-slate-500">Demo: simpan hint.</div>
                </div>
                <div class="text-slate-400">›</div>
              </button>

              <button id="btnAutoLogout" class="w-full rounded-2xl border border-slate-200 p-3 flex items-center justify-between hover:bg-slate-50">
                <div class="text-left">
                  <div class="font-medium">Auto Logout</div>
                  <div class="text-sm text-slate-500">${s.autoLogoutMin} menit (demo)</div>
                </div>
                <div class="text-slate-400">›</div>
              </button>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Limit Transaksi</div>
            <div class="mt-3 space-y-2">
              <button id="btnDailyLimit" class="w-full rounded-2xl border border-slate-200 p-3 flex items-center justify-between hover:bg-slate-50">
                <div class="text-left">
                  <div class="font-medium">Limit Harian Transfer</div>
                  <div class="text-sm text-slate-500">${rupiah(s.dailyTxLimit)}</div>
                </div>
                <div class="text-slate-400">›</div>
              </button>
            </div>
          </div>

          <div class="card p-4">
            <div class="font-semibold">Aktivitas</div>
            <div class="text-sm text-slate-500 mt-2">Notifikasi keamanan akan masuk ke Inbox.</div>
            <a href="#/notif" class="inline-block btn btn-ghost w-full mt-3">Buka Notifikasi</a>
          </div>
        </section>
      `);

      byId("btnChangePin").onclick = () => {
        openModal({
          title: "Ubah PIN (Demo)",
          bodyHtml: `
            <div class="text-sm text-slate-600">Masukkan PIN baru 6 digit.</div>
            <div class="mt-3">
              <input id="pinNew" class="input" inputmode="numeric" placeholder="******" />
            </div>
          `,
          primaryText: "Simpan",
          onPrimary: () => {
            const p = (byId("pinNew").value || "").trim();
            if (!/^\d{6}$/.test(p)) return toast("PIN harus 6 digit");
            state.user.pinHint = "******";
            state.notifications.unshift({
              id:"n_" + cryptoRand(),
              date:new Date().toISOString().slice(0,10),
              title:"Keamanan",
              body:"PIN berhasil diubah (demo).",
              read:false,
              type:"security"
            });
            saveState();
            closeModal();
            toast("PIN diubah");
          }
        });
      };

      byId("btnAutoLogout").onclick = () => {
        openModal({
          title: "Auto Logout (Demo)",
          bodyHtml: `
            <div class="text-sm text-slate-600">Pilih durasi auto logout.</div>
            <div class="mt-3">
              <select id="alMin" class="input">
                <option value="1">1 menit</option>
                <option value="3">3 menit</option>
                <option value="5">5 menit</option>
                <option value="10">10 menit</option>
              </select>
            </div>
          `,
          primaryText: "Simpan",
          onPrimary: () => {
            const v = parseInt(byId("alMin").value, 10);
            state.settings.autoLogoutMin = v;
            saveState();
            closeModal();
            toast("Auto logout diupdate");
            viewSecurity();
          }
        });
        byId("alMin").value = String(state.settings.autoLogoutMin);
      };

      byId("btnDailyLimit").onclick = () => {
        openModal({
          title: "Limit Harian Transfer",
          bodyHtml: `
            <div class="text-sm text-slate-600">Set maksimum total transfer per transaksi (demo limit sederhana).</div>
            <div class="mt-3">
              <input id="dlVal" class="input" inputmode="numeric" value="${state.settings.dailyTxLimit}" />
            </div>
          `,
          primaryText: "Simpan",
          onPrimary: () => {
            const v = parseInt((byId("dlVal").value || "0").trim(), 10);
            if (!v || isNaN(v) || v <= 0) return toast("Limit tidak valid");
            state.settings.dailyTxLimit = v;
            saveState();
            closeModal();
            toast("Limit tersimpan");
            viewSecurity();
          }
        });
      };
    }

    function viewNotFound() {
      setTitle("Tidak ditemukan");
      render(`
        <div class="card p-6 text-center">
          <div class="text-2xl font-bold">404</div>
          <div class="text-slate-500 mt-1">Halaman tidak ditemukan.</div>
          <a href="#/dashboard" class="inline-block btn btn-primary mt-4">Kembali</a>
        </div>
      `);
    }

    // ---------------------------
    // Router
    // ---------------------------
    const routes = {
      "#/dashboard": viewDashboard,
      "#/notif": viewNotifications,
      "#/rekening-baru": viewAddAccount,
      "#/pinjaman": viewLoan,
      "#/transfer": viewTransferSim,
      "#/transfer-confirm": viewTransferConfirm,
      "#/mutasi": viewMutasi,
      "#/card": viewCard,
      "#/card-limit": viewCardLimit,
      "#/topup": viewTopUp,
      "#/tagihan": viewBills,
      "#/qris": viewQRIS,
      "#/split": viewSplitBill,
      "#/profile": viewProfile,
      "#/setting": viewSetting,
      "#/security": viewSecurity,
    };

    function route() {
      const hash = location.hash || "#/dashboard";
      const view = routes[hash] || viewNotFound;
      view();
      activeNav(hash);
      updateNotifDot();
    }

    window.addEventListener("hashchange", route);

    // nav click
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.getAttribute("data-route");
        if (r) location.hash = r;
      });
    });

    // topbar
    byId("btnBell").onclick = () => location.hash = "#/notif";

    if (!location.hash) location.hash = "#/dashboard";
    route();
    updateNotifDot();

    // ---------------------------
    // UI Helpers (HTML builders)
    // ---------------------------
    function quickAction(href, label, icon) {
      return `
        <a href="${href}" class="rounded-2xl border border-slate-200 p-3 text-center hover:bg-slate-50 active:scale-[0.99]">
          <div class="mx-auto w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800">
            ${icon}
          </div>
          <div class="mt-2 text-xs font-semibold text-slate-700">${label}</div>
        </a>
      `;
    }

    function miniPromo(title, desc, href) {
      return `
        <a href="${href}" class="card p-4 hover:bg-slate-50 active:scale-[0.99]">
          <div class="font-semibold">${title}</div>
          <div class="text-sm text-slate-500 mt-1">${desc}</div>
          <div class="text-sm mt-3 text-slate-900 font-semibold">Buka →</div>
        </a>
      `;
    }

    function txRow(t) {
      const positive = t.amount > 0;
      const amt = positive ? `+${rupiah(t.amount)}` : `-${rupiah(Math.abs(t.amount))}`;
      const pill = positive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
      return `
        <div class="rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="font-medium truncate">${escapeHtml(t.desc)}</div>
            <div class="text-xs text-slate-500">${t.date} • ${escapeHtml(t.category || "General")}</div>
          </div>
          <div class="text-right shrink-0">
            <div class="font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}">${amt}</div>
            <div class="mt-1"><span class="chip ${pill}">${positive ? "Masuk" : "Keluar"}</span></div>
          </div>
        </div>
      `;
    }

    function menuLink(label, href) {
      return `
        <a href="${href}" class="rounded-2xl border border-slate-200 p-3 flex items-center justify-between hover:bg-slate-50">
          <div class="font-medium">${label}</div>
          <div class="text-slate-400">›</div>
        </a>
      `;
    }

    function kvRow(k, v) {
      return `
        <div class="rounded-2xl border border-slate-200 p-3">
          <div class="text-xs text-slate-500">${escapeHtml(k)}</div>
          <div class="font-medium">${escapeHtml(String(v))}</div>
        </div>
      `;
    }

    function toggleRow(label, value, key=null) {
      const on = !!value;
      return `
        <button class="w-full rounded-2xl border border-slate-200 p-3 flex items-center justify-between hover:bg-slate-50"
          ${key ? `data-toggle-key="${key}"` : ""} type="button">
          <div class="text-left">
            <div class="font-medium">${label}</div>
            <div class="text-sm text-slate-500">${on ? "Aktif" : "Nonaktif"}</div>
          </div>
          <div class="w-12 h-7 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"} relative transition">
            <div class="w-6 h-6 bg-white rounded-full absolute top-0.5 ${on ? "right-0.5" : "left-0.5"} shadow"></div>
          </div>
        </button>
      `;
    }

    // ---------------------------
    // Modals
    // ---------------------------
    function openModal({ title, bodyHtml, primaryText="OK", secondaryText="Batal", onPrimary=null, onSecondary=null }) {
      const root = byId("modalRoot");
      root.innerHTML = `
        <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end justify-center" id="modalOverlay">
          <div class="mx-auto max-w-md w-full bg-white rounded-t-3xl p-4 border-t border-slate-200">
            <div class="flex items-center justify-between">
              <div class="font-semibold">${escapeHtml(title)}</div>
              <button id="mClose" class="p-2 rounded-xl hover:bg-slate-100">✕</button>
            </div>
            <div class="mt-4">${bodyHtml}</div>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <button id="mSecondary" class="btn btn-ghost">${secondaryText}</button>
              <button id="mPrimary" class="btn btn-primary">${primaryText}</button>
            </div>
          </div>
        </div>
      `;

      const overlay = byId("modalOverlay");
      const close = () => closeModal();

      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      byId("mClose").onclick = close;

      byId("mSecondary").onclick = () => {
        if (onSecondary) onSecondary();
        close();
      };
      byId("mPrimary").onclick = () => {
        if (onPrimary) onPrimary();
        else close();
      };
    }

    function closeModal() {
      byId("modalRoot").innerHTML = "";
    }

    function openBucketModal() {
      openModal({
        title: "Tambah Bucket",
        bodyHtml: `
          <div class="space-y-3">
            <div>
              <div class="text-sm font-medium mb-1">Nama</div>
              <input id="mName" class="input" placeholder="Contoh: Liburan" />
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Nominal</div>
              <input id="mAmt" class="input" inputmode="numeric" placeholder="Contoh: 500000" />
            </div>
          </div>
        `,
        primaryText: "Simpan",
        onPrimary: () => {
          const name = byId("mName").value.trim();
          const amt = parseInt((byId("mAmt").value || "0").trim(), 10);
          if (!name) return toast("Nama bucket wajib");
          if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal wajib > 0");
          state.buckets.unshift({ id:"b_" + cryptoRand(), name, amount: amt });
          saveState();
          closeModal();
          viewDashboard();
          toast("Bucket ditambahkan");
        }
      });
    }

    function openExportModal(items) {
      openModal({
        title: "Export Mutasi",
        bodyHtml: `
          <div class="text-sm text-slate-600">
            Export transaksi yang sedang tampil (${items.length} item) sebagai CSV.
          </div>
          <div class="mt-3 rounded-2xl border border-slate-200 p-3">
            <div class="text-xs text-slate-500">Preview</div>
            <div class="text-sm text-slate-700 mt-1">Kolom: date, desc, category, amount</div>
          </div>
        `,
        primaryText: "Download CSV",
        onPrimary: () => {
          const csv = toCSV(items);
          downloadTextFile(csv, `mutasi_${new Date().toISOString().slice(0,10)}.csv`, "text/csv;charset=utf-8");
          closeModal();
          toast("CSV diunduh");
        }
      });
    }

    function openLoanDetailModal(loan) {
      openModal({
        title: "Detail Pinjaman",
        bodyHtml: `
          <div class="space-y-2 text-sm text-slate-600">
            <div class="rounded-2xl border border-slate-200 p-3">
              <div class="text-xs text-slate-500">Pokok</div>
              <div class="font-semibold text-slate-900">${rupiah(loan.principal)}</div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Tenor</div>
                <div class="font-semibold text-slate-900">${loan.tenorMonths} bln</div>
              </div>
              <div class="rounded-2xl border border-slate-200 p-3">
                <div class="text-xs text-slate-500">Bunga (p.a.)</div>
                <div class="font-semibold text-slate-900">${loan.rateAnnual}%</div>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200 p-3">
              <div class="text-xs text-slate-500">Cicilan/bulan (estimasi)</div>
              <div class="font-semibold text-slate-900">${rupiah(calcLoanMonthly(loan.principal, loan.tenorMonths, loan.rateAnnual))}</div>
            </div>
            <div class="text-xs text-slate-500">*Perhitungan flat demo.</div>
          </div>
        `,
        primaryText: "Tutup",
        secondaryText: "Bayar",
        onSecondary: () => openPayLoanModal(loan)
      });
    }

    function openPayLoanModal(loan) {
      const monthly = calcLoanMonthly(loan.principal, loan.tenorMonths, loan.rateAnnual);
      openModal({
        title: "Bayar Cicilan",
        bodyHtml: `
          <div class="text-sm text-slate-600">Pilih nominal pembayaran (demo).</div>
          <div class="mt-3 space-y-3">
            <div class="rounded-2xl border border-slate-200 p-3">
              <div class="text-xs text-slate-500">Cicilan/bulan</div>
              <div class="font-semibold text-slate-900">${rupiah(monthly)}</div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Nominal</div>
              <input id="payAmt" class="input" inputmode="numeric" value="${monthly}" />
            </div>
          </div>
        `,
        primaryText: "Bayar",
        onPrimary: () => {
          const amt = parseInt((byId("payAmt").value || "0").trim(), 10);
          if (!amt || isNaN(amt) || amt <= 0) return toast("Nominal tidak valid");
          const acc = state.accounts[0];
          if (acc.balance < amt) return toast("Saldo tidak cukup");

          acc.balance -= amt;
          loan.paidMonths = Math.min((loan.paidMonths || 0) + 1, loan.tenorMonths);

          state.tx.unshift({
            id:"t_" + cryptoRand(),
            date:new Date().toISOString().slice(0,10),
            desc:`Bayar Cicilan Pinjaman`,
            amount:-amt,
            category:"Loan"
          });

          if (loan.paidMonths >= loan.tenorMonths) {
            loan.status = "Closed";
            state.notifications.unshift({
              id:"n_" + cryptoRand(),
              date:new Date().toISOString().slice(0,10),
              title:"Pinjaman Lunas",
              body:"Selamat! Pinjaman kamu sudah lunas (demo).",
              read:false,
              type:"info"
            });
          } else {
            state.notifications.unshift({
              id:"n_" + cryptoRand(),
              date:new Date().toISOString().slice(0,10),
              title:"Cicilan Dibayar",
              body:`Pembayaran cicilan ${rupiah(amt)} berhasil (demo).`,
              read:false,
              type:"info"
            });
          }

          saveState();
          closeModal();
          toast("Pembayaran sukses");
          viewLoan();
        }
      });
    }

    // ---------------------------
    // Utils
    // ---------------------------
    function cryptoRand() {
      try {
        const a = new Uint32Array(1);
        crypto.getRandomValues(a);
        return a[0].toString(16);
      } catch {
        return Math.floor(Math.random() * 1e9).toString(16);
      }
    }

    function maskAccount(no) {
      const s = String(no || "");
      if (s.length <= 4) return s;
      return "•••• •••• " + s.slice(-4);
    }

    function maskPhone(p) {
      const s = String(p || "");
      if (s.length <= 4) return s;
      return s.slice(0,3) + "••••" + s.slice(-2);
    }

    function maskPan(pan) {
      const parts = String(pan || "").split(" ");
      if (parts.length !== 4) return "•••• •••• •••• ••••";
      return `${parts[0]} •••• •••• ${parts[3]}`;
    }

    function rnd4() {
      return String(Math.floor(1000 + Math.random() * 9000));
    }

    function initials(name) {
      const p = (name || "").trim().split(/\s+/).slice(0,2);
      return p.map(x => x[0]?.toUpperCase() || "").join("");
    }

    function escapeHtml(str) {
      return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function calcLoanMonthly(amount, tenor, rateAnnual) {
      const r = (rateAnnual/100);
      return Math.round((amount * (1 + r)) / tenor);
    }

    function toCSV(items) {
      const header = ["date","desc","category","amount"];
      const rows = items.map(t => [
        t.date,
        (t.desc || "").replaceAll('"','""'),
        t.category || "",
        String(t.amount || 0)
      ]);
      const lines = [header.join(",")].concat(rows.map(r => `"${r[0]}","${r[1]}","${r[2]}","${r[3]}"`));
      return lines.join("\n");
    }

    function downloadTextFile(text, filename, mime) {
      const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function mergeDeep(target, source) {
      if (typeof target !== "object" || target === null) return source;
      if (typeof source !== "object" || source === null) return target;
      for (const k of Object.keys(source)) {
        if (Array.isArray(source[k])) target[k] = source[k];
        else if (typeof source[k] === "object" && source[k] !== null) target[k] = mergeDeep(target[k] ?? {}, source[k]);
        else target[k] = source[k];
      }
      return target;
    }

    // Icons
    function eyeIcon(mode) {
      if (mode === "closed") {
        return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-5-10-7 0-.657.328-1.59.94-2.59M9.88 9.88A3 3 0 0114.12 14.12M6.228 6.228L3 3m3.228 3.228l14.544 14.544M21 21l-3.228-3.228M15 12a3 3 0 00-3-3" />
        </svg>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>`;
    }
    function transferIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 7l4-4M7 7l4 4M17 17H7m10 0l-4-4m4 4l-4 4"/>
      </svg>`;
    }
    function listIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>`;
    }
    function plusIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>`;
    }
    function loanIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 14v-2M6 8h.01M6 16h.01M18 8h.01M18 16h.01"/>
      </svg>`;
    }
    function boltIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>`;
    }
    function billIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l2 2 4-4M7 3h10a2 2 0 012 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z"/>
      </svg>`;
    }
    function qrIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h3v3H7V7zm7 0h3v3h-3V7zM7 14h3v3H7v-3zm7 7v-3m0 0h3v3m-3-3h-3m-7 0h3m-3 0v3m0-3H4v-3m0 0h3m-3 0V4h3m0 0h3m-3 0v3m10-3h3v3m0-3V4h-3"/>
      </svg>`;
    }
    function splitIcon() {
      return `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a3 3 0 116 0v10a3 3 0 11-6 0V7zM8 12h8"/>
      </svg>`;
    }
  
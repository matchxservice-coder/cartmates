import { useState, useEffect, useRef } from "react";
import SoulMatesPanel from "./SoulMatesPanel";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmation from "./OrderConfirmation";

// ─────────────────────────────────────────────────────────────────────────────
//  LandingPage.jsx  —  CartMates v3.0  (Mobile-First Responsive)
//  Props: onLogin (fn) | onRegister (fn)
// ─────────────────────────────────────────────────────────────────────────────

/* ══════════════════════════════ BRAND ════════════════════════════════════════ */
const C = {
  primary: "#075BB0",
  action:  "#0484CF",
  yellow:  "#FFEB59",
  bg:      "#F8FAFC",
  dark:    "#0A1628",
  text:    "#0F172A",
  muted:   "#64748B",
};

/* ══════════════════════════════ TRANSLATIONS ════════════════════════════════ */
const T = {
  en: {
    lang:"EN", flag:"🇬🇧",
    nav:{ home:"Home", services:"Services", howItWorks:"How It Works", pricing:"Pricing", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"FAQ", login:"Login", getStarted:"Get Started" },
    hero:{ badge:"🌏 Thailand → Worldwide Shipping", h1a:"Your Personal", h1b:"Thai Shopping", h1c:"Mate 🐰", sub:"Shop Thai merch easily — delivered to your door, anywhere in the world. Official BL/GL merch, artist brands, Thai snacks — we handle it all!", cta1:"Start for Free 🎉", cta2:"How It Works ↓", trust:["Secure Payment","Photo Verified","25+ Countries"] },
    marquee:["🐰 New member discount — 10% off first shipment!","📦 Free recheck for Premium & Ultimate plans","🌟 GMMTV Official Merch now in stock","✈️ Express shipping to 25+ countries","💛 Upgrade to Ultimate — early access to exclusive drops","🎁 Refer a friend and earn 100 THB credit"],
    stats:[{n:"8+",l:"Years Experience",e:"🏆"},{n:"25+",l:"Countries Served",e:"🌏"},{n:"10K+",l:"Happy Customers",e:"💌"}],
    services:{ badge:"✨ What We Do", h2a:"Everything You Need,", h2b:"In One Place", sub:"Your most trusted partner for Thai merchandise — fast, transparent, and friendly.", items:[{icon:"🛒",title:"Proxy Purchase",desc:"Buy from Thai stores without a Thai account. We purchase, verify, and forward to you."},{icon:"🏭",title:"Warehouse Storage",desc:"Store up to 90 days. Consolidate multiple orders into one shipment to save on shipping."},{icon:"✈️",title:"International Shipping",desc:"Ship to 25+ countries. Multiple carrier partners for the best rate per destination."},{icon:"📦",title:"Professional Packing",desc:"Expert packing with photos at every step. Bubble wrap protection and damage coverage."},{icon:"📊",title:"GOM Dashboard",desc:"Professional order management for Group Order Managers — replaces Google Forms."},{icon:"🔔",title:"Real-time Tracking",desc:"Get notified at every step, from warehouse arrival to your front door."}] },
    howItWorks:{ badge:"🗺️ Simple Process", h2a:"Just", h2b:"4 Steps", steps:[{n:"1",icon:"📝",t:"Sign Up",d:"Choose your plan and register in 3 minutes. Receive your Smart ID instantly."},{n:"2",icon:"🛍️",t:"Shop",d:"Order from Thai stores using our warehouse address. Packages arrive directly."},{n:"3",icon:"📸",t:"Verify & Pack",d:"We photograph your items, pack professionally, and send you the shipping quote."},{n:"4",icon:"🚀",t:"Delivered!",d:"Pay shipping, get your tracking number, and wait for your package at home."}] },
    top10:{ badge:"🔥 Today's Top Sellers", h2:"Top 10 Best Sellers", sub:"Most popular items shipped from Thailand today — updated daily.", soldLabel:"sold" },
    upcoming:{ badge:"📅 What's Coming Next", h2:"Latest Updates", sub:"Artist news, merch drops, promotions and shipping alerts — all in one place.", readMore:"Read More →" },
    pricing:{ badge:"💎 Team Mates Plan", h2a:"Choose Your", h2b:"Perfect Plan", sub:"For GOM and importers. Monthly billing. The more you ship, the more you save.", note:"* Video-before-unboxing available as add-on · Prices include VAT · 7-day free trial", cta:"Start" },
    faq:{ badge:"❓ FAQ", h2:"Frequently Asked Questions", items:[{q:"Which countries do you ship to?",a:"We ship to 25+ countries worldwide including Japan, South Korea, USA, Australia, most of Europe, and Southeast Asia."},{q:"How long can items stay in the warehouse?",a:"Team Mates members can store items for up to 90 days. After that, a storage fee applies."},{q:"What if my item is damaged during shipping?",a:"We photograph every item before packing. We have a clear claims process and will liaise with the carrier on your behalf."},{q:"Can a GOM sign up for the Team Mates plan?",a:"Absolutely! Sign up online, complete identity verification, and access your dashboard immediately."},{q:"What payment methods do you accept?",a:"Credit/Debit Card, Bank Transfer, PromptPay, and local payment methods for select countries."}] },
    ctaBanner:{ h2:"Ready to Get Started?", sub:"Join 10,000+ customers worldwide who trust CartMates. Sign up free — no joining fee.", btn1:"Create Free Account →", btn2:"Login" },
    market:{ badge:"🛍️ Mates Market", h2:"Shop Thai Merchandise", sub:"Official, authentic Thai products shipped worldwide. Buy directly through CartMates.", categories:["All","BL/GL Official","Artist Brand","K-pop","Food & Snacks","Beauty","Fashion"], searchPlaceholder:"Search products...", addCart:"Add to Cart", inStock:"In Stock", limitedStock:"Limited" },
    club:{ badge:"⭐ Mates Club", h2:"Fan Hub & News", sub:"Your go-to community for Thai entertainment — artist news, album drops, event alerts and exclusive CartMates deals.", categories:["All","Artist News","New Merch","Events","Promotions","Shipping Updates"], readMore:"Read More →" },
    footer:{ tagline:"Your personal Thai shopping mate. Bringing Thai culture, merchandise, and brands to fans around the world.", cols:[{title:"Services",links:["Proxy Purchase","Warehouse","International Shipping","GOM Dashboard"]},{title:"Explore",links:["Mates Market","Mates Club","Pricing","FAQ"]},{title:"Follow Us",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates. All rights reserved.", legal:["Privacy Policy","Terms of Service","Prohibited Items"] },
  },
  th: {
    lang:"ไทย", flag:"🇹🇭",
    nav:{ home:"หน้าหลัก", services:"บริการ", howItWorks:"วิธีใช้", pricing:"ราคา", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"คำถาม", login:"เข้าสู่ระบบ", getStarted:"เริ่มต้น" },
    hero:{ badge:"🌏 ไทย → ทั่วโลก", h1a:"เพื่อนช้อปส่วนตัว", h1b:"สินค้าไทย", h1c:"ของคุณ 🐰", sub:"ช้อปสินค้าไทยง่ายๆ ส่งตรงถึงหน้าบ้านทั่วโลก Official BL/GL Merch, สินค้าศิลปิน หรือขนมไทย — เราจัดการให้ครบ!", cta1:"เริ่มต้นฟรี 🎉", cta2:"ดูวิธีใช้ ↓", trust:["ชำระเงินปลอดภัย","ถ่ายรูปยืนยัน","กว่า 25 ประเทศ"] },
    marquee:["🐰 สมาชิกใหม่ ลด 10% ค่าส่งครั้งแรก!","📦 รีเช็คฟรี สำหรับแพ็คเกจ Premium & Ultimate","🌟 สินค้า GMMTV Official มีแล้ว","✈️ จัดส่งด่วนกว่า 25 ประเทศ","💛 อัปเกรด Ultimate รับสิทธิ์ซื้อก่อนใคร","🎁 แนะนำเพื่อน รับเครดิต 100 บาท"],
    stats:[{n:"8+",l:"ปีประสบการณ์",e:"🏆"},{n:"25+",l:"ประเทศที่ส่ง",e:"🌏"},{n:"10K+",l:"ลูกค้าพึงพอใจ",e:"💌"}],
    services:{ badge:"✨ บริการของเรา", h2a:"ครบครัน", h2b:"ในที่เดียว", sub:"เพื่อนสนิทแฟนคลับที่เชื่อใจได้มากที่สุด เร็ว โปร่งใส เป็นกันเอง", items:[{icon:"🛒",title:"บริการซื้อแทน",desc:"ช้อปจากร้านไทยโดยไม่ต้องมีบัญชีไทย เราซื้อ ตรวจสอบ ส่งต่อให้คุณ"},{icon:"🏭",title:"ฝากสินค้าที่คลัง",desc:"ฝากได้สูงสุด 90 วัน รวมออเดอร์หลายรายการเพื่อประหยัดค่าส่ง"},{icon:"✈️",title:"ส่งไปต่างประเทศ",desc:"ส่งกว่า 25 ประเทศ มีพาร์ทเนอร์ขนส่งหลายเจ้า คัดราคาดีที่สุดให้"},{icon:"📦",title:"แพคมืออาชีพ",desc:"แพคอย่างพิถีพิถัน ถ่ายรูปทุกขั้นตอน มี bubble wrap และคุ้มครองความเสียหาย"},{icon:"📊",title:"GOM Dashboard",desc:"ระบบจัดการออเดอร์สำหรับ GOM แทนที่ Google Form ด้วยระบบมืออาชีพ"},{icon:"🔔",title:"แจ้งเตือนเรียลไทม์",desc:"รับการแจ้งเตือนทุกขั้นตอน ตั้งแต่ของมาถึงคลังจนถึงหน้าบ้านคุณ"}] },
    howItWorks:{ badge:"🗺️ ขั้นตอนง่ายๆ", h2a:"แค่", h2b:"4 ขั้นตอน", steps:[{n:"1",icon:"📝",t:"สมัครสมาชิก",d:"เลือกแพ็คเกจและสมัครออนไลน์ใน 3 นาที รับ Smart ID ทันที"},{n:"2",icon:"🛍️",t:"สั่งซื้อ",d:"ช้อปจากร้านไทยโดยใช้ที่อยู่คลัง CartMates ของจะมาถึงโดยตรง"},{n:"3",icon:"📸",t:"ตรวจสอบ & แพค",d:"เราถ่ายรูปตรวจสอบ แพคอย่างมืออาชีพ และแจ้งราคาค่าส่ง"},{n:"4",icon:"🚀",t:"จัดส่งถึงบ้าน!",d:"ชำระค่าส่ง รับเลข tracking แล้วรอรับของที่บ้านได้เลย"}] },
    top10:{ badge:"🔥 ขายดีประจำวัน", h2:"Top 10 สินค้าขายดี", sub:"สินค้าที่ถูกสั่งซื้อจากไทยมากที่สุดวันนี้ — อัพเดตทุกวัน", soldLabel:"ชิ้น" },
    upcoming:{ badge:"📅 ข่าวสาร & อัพเดต", h2:"What's Coming Next", sub:"ข่าวศิลปิน สินค้าใหม่ โปรโมชั่น และอัพเดตการจัดส่ง — ทุกอย่างในที่เดียว", readMore:"อ่านต่อ →" },
    pricing:{ badge:"💎 แพ็คเกจ Team Mates", h2a:"เลือกแพ็คเกจ", h2b:"ที่ใช่สำหรับคุณ", sub:"สำหรับ GOM และผู้นำเข้า ชำระรายเดือน ยิ่งสั่งเยอะยิ่งคุ้ม", note:"* วิดีโอก่อนแกะสินค้ามีค่าบริการเพิ่มเติม · ราคารวม VAT · ทดลองใช้ 7 วัน", cta:"เริ่มต้น" },
    faq:{ badge:"❓ คำถามที่พบบ่อย", h2:"คำถามที่พบบ่อย", items:[{q:"ส่งไปประเทศไหนได้บ้าง?",a:"เราส่งไปกว่า 25 ประเทศทั่วโลก รวมถึงญี่ปุ่น เกาหลี อเมริกา ออสเตรเลีย ยุโรป และเอเชียตะวันออกเฉียงใต้"},{q:"ของอยู่ที่คลังได้นานแค่ไหน?",a:"สมาชิก Team Mates สามารถฝากได้สูงสุด 90 วัน หลังจากนั้นจะมีค่าบริการเก็บรักษา"},{q:"ถ้าของเสียหายระหว่างส่งทำอย่างไร?",a:"เราถ่ายรูปทุกขั้นตอนก่อนส่ง มีระบบเคลมที่ชัดเจน และช่วยติดต่อขนส่งแทนคุณ"},{q:"GOM สมัคร Team Mates ได้เลยไหม?",a:"ได้เลย! สมัครออนไลน์ ผ่านการยืนยันตัวตน และเข้าใช้ dashboard ได้ทันที"},{q:"รับชำระเงินช่องทางไหนบ้าง?",a:"รับ Credit/Debit Card, โอนเงิน, PromptPay และช่องทางท้องถิ่นสำหรับบางประเทศ"}] },
    ctaBanner:{ h2:"พร้อมเริ่มต้นแล้วหรือยัง?", sub:"เข้าร่วมกับลูกค้ากว่า 10,000 คนทั่วโลกที่ไว้วางใจ CartMates สมัครฟรี ไม่มีค่าธรรมเนียม", btn1:"สมัครสมาชิกฟรี →", btn2:"เข้าสู่ระบบ" },
    market:{ badge:"🛍️ Mates Market", h2:"ช้อปสินค้าไทย", sub:"สินค้าไทยของแท้ ส่งทั่วโลก ซื้อตรงผ่าน CartMates ไม่ต้องใช้ proxy", categories:["ทั้งหมด","BL/GL Official","สินค้าศิลปิน","K-pop","อาหาร & ขนม","ความงาม","แฟชั่น"], searchPlaceholder:"ค้นหาสินค้า...", addCart:"เพิ่มในตะกร้า", inStock:"มีสินค้า", limitedStock:"จำกัด" },
    club:{ badge:"⭐ Mates Club", h2:"ศูนย์รวมแฟนคลับ", sub:"แหล่งรวมข่าวสารความบันเทิงไทย — ข่าวศิลปิน อัลบั้มใหม่ งานอีเวนต์ และดีลพิเศษ CartMates", categories:["ทั้งหมด","ข่าวศิลปิน","สินค้าใหม่","อีเวนต์","โปรโมชั่น","อัพเดตการส่ง"], readMore:"อ่านต่อ →" },
    footer:{ tagline:"เพื่อนช้อปส่วนตัวของคุณ ส่งสินค้าวัฒนธรรมไทยและแบรนด์ไทยไปให้แฟนๆ ทั่วโลก", cols:[{title:"บริการ",links:["บริการซื้อแทน","ฝากสินค้า","ส่งต่างประเทศ","GOM Dashboard"]},{title:"สำรวจ",links:["Mates Market","Mates Club","ราคา","คำถาม"]},{title:"ติดตามเรา",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates สงวนลิขสิทธิ์", legal:["นโยบายความเป็นส่วนตัว","เงื่อนไขการใช้งาน","สินค้าต้องห้าม"] },
  },
  zh: {
    lang:"中文", flag:"🇨🇳",
    nav:{ home:"首页", services:"服务", howItWorks:"如何使用", pricing:"价格", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"常见问题", login:"登录", getStarted:"立即开始" },
    hero:{ badge:"🌏 泰国 → 全球配送", h1a:"您的专属", h1b:"泰国购物", h1c:"伙伴 🐰", sub:"轻松购买泰国商品，直接配送到您家门口。官方BL/GL周边、艺人品牌、泰国零食——我们全程搞定！", cta1:"免费开始! 🎉", cta2:"了解更多 ↓", trust:["安全支付","照片验证","25+个国家"] },
    marquee:["🐰 新会员首次配送享九折优惠！","📦 Premium及Ultimate会员免费复查","🌟 GMMTV官方周边现已到库","✈️ 快递服务现覆盖25+国家","💛 升级Ultimate，抢先购买独家商品","🎁 推荐朋友，赚取100泰铢积分"],
    stats:[{n:"8+",l:"年经验",e:"🏆"},{n:"25+",l:"服务国家",e:"🌏"},{n:"10K+",l:"满意客户",e:"💌"}],
    services:{ badge:"✨ 我们的服务", h2a:"一站式", h2b:"服务平台", sub:"您最信赖的泰国商品合作伙伴——快速、透明、友好。", items:[{icon:"🛒",title:"代购服务",desc:"无需泰国账户即可从泰国商店购物。我们代购、验证并转发给您。"},{icon:"🏭",title:"仓库存储",desc:"最长存储90天。合并多个订单节省运费。"},{icon:"✈️",title:"国际运输",desc:"配送至25+国家，多家承运商确保最优价格。"},{icon:"📦",title:"专业包装",desc:"专业包装，每步拍照记录，气泡膜保护及损坏保障。"},{icon:"📊",title:"GOM管理台",desc:"团购管理员专业订单管理系统，取代Google表单。"},{icon:"🔔",title:"实时追踪",desc:"从货物到仓到送达家门，全程接收通知。"}] },
    howItWorks:{ badge:"🗺️ 简单流程", h2a:"只需", h2b:"4步", steps:[{n:"1",icon:"📝",t:"注册",d:"在线选择方案，3分钟完成注册，立即获得专属Smart ID。"},{n:"2",icon:"🛍️",t:"购物",d:"使用我们的仓库地址从泰国商店下单，包裹直接到达CartMates。"},{n:"3",icon:"📸",t:"验证&打包",d:"我们拍照检查商品，专业打包，并向您发送运费报价。"},{n:"4",icon:"🚀",t:"送货上门!",d:"支付运费，收到追踪号码，等待包裹送达家门。"}] },
    top10:{ badge:"🔥 今日热销", h2:"Top 10 畅销商品", sub:"今日从泰国发出最多的商品——每日更新", soldLabel:"件" },
    upcoming:{ badge:"📅 即将到来", h2:"最新动态", sub:"艺人新闻、周边发售、促销活动和物流更新——尽在这里", readMore:"阅读更多 →" },
    pricing:{ badge:"💎 Team Mates方案", h2a:"选择适合您的", h2b:"方案", sub:"适合团购管理员和进口商，按月计费，发货越多越划算。", note:"* 开箱前录像为附加服务 · 价格含VAT · 7天免费试用", cta:"开始" },
    faq:{ badge:"❓ 常见问题", h2:"常见问题解答", items:[{q:"可以配送到哪些国家？",a:"我们配送至全球25+国家，包括日本、韩国、美国、澳大利亚、欧洲大部分地区及东南亚。"},{q:"货物可以在仓库存放多久？",a:"Team Mates会员最长可存储90天，之后将收取存储费。"},{q:"如果货物在运输途中损坏怎么办？",a:"我们在打包前拍照记录，有明确的索赔流程，并代您与承运商沟通。"},{q:"团购管理员可以直接注册Team Mates吗？",a:"当然！在线注册并完成实名认证后即可立即使用管理台。"},{q:"支持哪些支付方式？",a:"支持信用卡/借记卡、银行转账、PromptPay及部分国家的本地支付方式。"}] },
    ctaBanner:{ h2:"准备好开始了吗？", sub:"加入全球10,000+信任CartMates的客户。免费注册，无入会费。", btn1:"创建免费账户 →", btn2:"登录" },
    market:{ badge:"🛍️ Mates Market", h2:"购买泰国商品", sub:"官方正品泰国商品，全球配送。直接通过CartMates购买，无需代购。", categories:["全部","BL/GL官方","艺人品牌","K-pop","食品&零食","美妆","时尚"], searchPlaceholder:"搜索商品...", addCart:"加入购物车", inStock:"有货", limitedStock:"限量" },
    club:{ badge:"⭐ Mates Club", h2:"粉丝中心&新闻", sub:"泰国娱乐一站式社区——艺人新闻、专辑发布、活动提醒及CartMates独家优惠。", categories:["全部","艺人新闻","新品周边","活动","促销","物流更新"], readMore:"阅读更多 →" },
    footer:{ tagline:"您的专属泰国购物伙伴，将泰国文化、商品和品牌带给全球粉丝。", cols:[{title:"服务",links:["代购服务","仓库存储","国际运输","GOM管理台"]},{title:"探索",links:["Mates Market","Mates Club","价格","常见问题"]},{title:"关注我们",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates 版权所有", legal:["隐私政策","服务条款","禁运商品"] },
  },
  ja: {
    lang:"日本語", flag:"🇯🇵",
    nav:{ home:"ホーム", services:"サービス", howItWorks:"使い方", pricing:"料金", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"よくある質問", login:"ログイン", getStarted:"始める" },
    hero:{ badge:"🌏 タイ → 全世界へ配送", h1a:"あなただけの", h1b:"タイ直輸入", h1c:"パートナー 🐰", sub:"タイのグッズを簡単購入。世界中のご自宅へ直接配送。公式BL/GLグッズ、アーティストブランド、タイのお菓子など、すべておまかせ！", cta1:"無料で始める！🎉", cta2:"使い方を見る ↓", trust:["安全なお支払い","写真確認付き","25カ国以上"] },
    marquee:["🐰 新規会員様：初回配送10%割引！","📦 Premium・Ultimateプランは再確認無料","🌟 GMMTV公式グッズ入荷","✈️ 25カ国以上へ速達配送開始","💛 Ultimateにアップグレードして限定グッズ先行入手","🎁 お友達紹介で100バーツクレジット進呈"],
    stats:[{n:"8+",l:"年の経験",e:"🏆"},{n:"25+",l:"配送国",e:"🌏"},{n:"10K+",l:"満足のお客様",e:"💌"}],
    services:{ badge:"✨ サービス内容", h2a:"必要なものが", h2b:"すべて揃う", sub:"タイのグッズ購入・転送の最も信頼できるパートナー。迅速・透明・フレンドリー。", items:[{icon:"🛒",title:"代行購入",desc:"タイのアカウントなしでタイのショップから購入できます。"},{icon:"🏭",title:"倉庫保管",desc:"最長90日保管。複数注文をまとめて配送コストを節約。"},{icon:"✈️",title:"国際配送",desc:"25カ国以上へ配送。複数の運送業者で最適な料金を選択。"},{icon:"📦",title:"プロの梱包",desc:"丁寧な梱包と各ステップの写真撮影。気泡緩衝材と破損保障付き。"},{icon:"📊",title:"GOMダッシュボード",desc:"グループ注文管理者向けプロ管理システム。Googleフォームに代わる。"},{icon:"🔔",title:"リアルタイム追跡",desc:"倉庫への到着から玄関先まで、すべてのステップで通知。"}] },
    howItWorks:{ badge:"🗺️ 簡単なプロセス", h2a:"たった", h2b:"4ステップ", steps:[{n:"1",icon:"📝",t:"登録",d:"プランを選択してオンラインで3分で登録。すぐにSmart IDを取得。"},{n:"2",icon:"🛍️",t:"ショッピング",d:"倉庫住所を使ってタイのショップで注文。荷物はCartMatesに直接届く。"},{n:"3",icon:"📸",t:"確認&梱包",d:"商品を写真確認し、プロに梱包。送料の見積もりをお知らせ。"},{n:"4",icon:"🚀",t:"お届け！",d:"送料を支払い、追跡番号を受け取り、ご自宅へのお届けをお待ちください。"}] },
    top10:{ badge:"🔥 本日のベストセラー", h2:"Top 10 売れ筋商品", sub:"本日タイから最も多く発送された商品 — 毎日更新", soldLabel:"個" },
    upcoming:{ badge:"📅 最新情報", h2:"What's Coming Next", sub:"アーティストニュース、グッズ発売、キャンペーン、配送アップデートをここで確認。", readMore:"続きを読む →" },
    pricing:{ badge:"💎 Team Matesプラン", h2a:"最適な", h2b:"プランを選択", sub:"GOMと輸入業者向け。月額制。発送量が多いほどお得に。", note:"* 開封前動画は追加オプション · 料金はVAT込み · 7日間無料トライアル", cta:"開始" },
    faq:{ badge:"❓ よくある質問", h2:"よくある質問", items:[{q:"どの国に配送できますか？",a:"日本、韓国、米国、オーストラリア、ヨーロッパの大部分、東南アジアを含む25カ国以上に配送しています。"},{q:"荷物は倉庫に何日間保管できますか？",a:"Team Mates会員は最長90日間保管可能です。それ以降は保管料が発生します。"},{q:"配送中に荷物が破損した場合は？",a:"梱包前に毎回写真撮影を行います。明確なクレーム対応プロセスがあり、運送業者への対応も代行します。"},{q:"GOMもTeam Matesプランに登録できますか？",a:"もちろんです！オンラインで登録し、本人確認を完了するとすぐにダッシュボードが利用できます。"},{q:"どの支払い方法が使えますか？",a:"クレジット/デビットカード、銀行振込、PromptPay、および一部の国の現地決済方法に対応しています。"}] },
    ctaBanner:{ h2:"始める準備はできましたか？", sub:"世界中の10,000人以上のお客様がCartMatesを信頼しています。無料登録、入会費不要。", btn1:"無料アカウント作成 →", btn2:"ログイン" },
    market:{ badge:"🛍️ Mates Market", h2:"タイグッズを購入", sub:"公式・正規品のタイグッズを世界中にお届け。代行不要でCartMatesから直接購入。", categories:["すべて","BL/GL公式","アーティストブランド","K-pop","食品&お菓子","美容","ファッション"], searchPlaceholder:"商品を検索...", addCart:"カートに追加", inStock:"在庫あり", limitedStock:"数量限定" },
    club:{ badge:"⭐ Mates Club", h2:"ファンハブ&ニュース", sub:"タイのエンタメ情報ハブ — アーティストニュース、アルバム発売、イベント情報、CartMates限定オファー。", categories:["すべて","アーティストニュース","新グッズ","イベント","キャンペーン","配送アップデート"], readMore:"続きを読む →" },
    footer:{ tagline:"あなたの専属タイショッピングパートナー。タイの文化、グッズ、ブランドを世界中のファンへ。", cols:[{title:"サービス",links:["代行購入","倉庫保管","国際配送","GOMダッシュボード"]},{title:"探索",links:["Mates Market","Mates Club","料金","よくある質問"]},{title:"フォロー",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates All rights reserved.", legal:["プライバシーポリシー","利用規約","禁止商品"] },
  },
  pt: {
    lang:"PT", flag:"🇧🇷",
    nav:{ home:"Início", services:"Serviços", howItWorks:"Como Funciona", pricing:"Preços", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"FAQ", login:"Entrar", getStarted:"Começar" },
    hero:{ badge:"🌏 Tailândia → Entrega Mundial", h1a:"Seu Parceiro", h1b:"Personal de Compras", h1c:"Tailandesas 🐰", sub:"Compre produtos tailandeses com facilidade — entregues na sua porta, em qualquer lugar do mundo. Merch oficial BL/GL, marcas de artistas, snacks tailandeses — cuidamos de tudo!", cta1:"Começar Grátis! 🎉", cta2:"Como Funciona ↓", trust:["Pagamento Seguro","Verificado com Foto","25+ Países"] },
    marquee:["🐰 Desconto de 10% no primeiro envio para novos membros!","📦 Rechecagem grátis nos planos Premium & Ultimate","🌟 Merch Oficial GMMTV agora em estoque","✈️ Envio expresso disponível para 25+ países","💛 Atualize para Ultimate e tenha acesso antecipado","🎁 Indique um amigo e ganhe 100 THB de crédito"],
    stats:[{n:"8+",l:"Anos de Experiência",e:"🏆"},{n:"25+",l:"Países Atendidos",e:"🌏"},{n:"10K+",l:"Clientes Satisfeitos",e:"💌"}],
    services:{ badge:"✨ O Que Fazemos", h2a:"Tudo Que Você", h2b:"Precisa em Um Lugar", sub:"Seu parceiro mais confiável para mercadorias tailandesas — rápido, transparente e amigável.", items:[{icon:"🛒",title:"Compra por Procuração",desc:"Compre em lojas tailandesas sem conta tailandesa. Compramos, verificamos e enviamos."},{icon:"🏭",title:"Armazenamento",desc:"Armazene por até 90 dias. Consolide vários pedidos para economizar no frete."},{icon:"✈️",title:"Envio Internacional",desc:"Envio para 25+ países. Múltiplos parceiros de transporte para a melhor tarifa."},{icon:"📦",title:"Embalagem Profissional",desc:"Embalagem especializada com fotos em cada etapa. Proteção com bolhas e cobertura para danos."},{icon:"📊",title:"Painel GOM",desc:"Sistema profissional de gerenciamento de pedidos para Group Order Managers."},{icon:"🔔",title:"Rastreamento em Tempo Real",desc:"Receba notificações em cada etapa, da chegada ao depósito até sua porta."}] },
    howItWorks:{ badge:"🗺️ Processo Simples", h2a:"Apenas", h2b:"4 Passos", steps:[{n:"1",icon:"📝",t:"Cadastre-se",d:"Escolha seu plano e cadastre-se online em 3 minutos. Receba seu Smart ID instantaneamente."},{n:"2",icon:"🛍️",t:"Compre",d:"Peça em lojas tailandesas usando nosso endereço de depósito."},{n:"3",icon:"📸",t:"Verificar & Embalar",d:"Fotografamos seus itens, embalamos profissionalmente e enviamos a cotação de frete."},{n:"4",icon:"🚀",t:"Entregue!",d:"Pague o frete, receba o número de rastreamento e aguarde o pacote em casa."}] },
    top10:{ badge:"🔥 Mais Vendidos Hoje", h2:"Top 10 Mais Vendidos", sub:"Produtos mais enviados da Tailândia hoje — atualizado diariamente.", soldLabel:"vendidos" },
    upcoming:{ badge:"📅 O Que Vem Por Aí", h2:"Últimas Atualizações", sub:"Notícias de artistas, lançamentos de merch, promoções e alertas de envio — tudo em um lugar.", readMore:"Leia Mais →" },
    pricing:{ badge:"💎 Plano Team Mates", h2a:"Escolha o Seu", h2b:"Plano Ideal", sub:"Para GOM e importadores. Cobrança mensal. Quanto mais você envia, mais economiza.", note:"* Vídeo antes de abrir disponível como extra · Preços incluem IVA · 7 dias de teste grátis", cta:"Começar" },
    faq:{ badge:"❓ FAQ", h2:"Perguntas Frequentes", items:[{q:"Para quais países vocês enviam?",a:"Enviamos para 25+ países incluindo Japão, Coreia do Sul, EUA, Austrália, maioria da Europa e Sudeste Asiático."},{q:"Por quanto tempo os itens ficam no depósito?",a:"Membros Team Mates podem armazenar por até 90 dias. Após isso, taxa de armazenamento é aplicada."},{q:"E se meu item for danificado durante o envio?",a:"Fotografamos tudo antes de embalar. Temos processo de reclamação claro e intermediamos com a transportadora."},{q:"Um GOM pode se cadastrar no plano Team Mates?",a:"Claro! Cadastre-se online, complete a verificação de identidade e acesse seu painel imediatamente."},{q:"Quais métodos de pagamento são aceitos?",a:"Cartão de Crédito/Débito, Transferência Bancária, PromptPay e métodos locais para alguns países."}] },
    ctaBanner:{ h2:"Pronto Para Começar?", sub:"Junte-se a 10.000+ clientes em todo o mundo que confiam no CartMates. Cadastro gratuito — sem taxa de adesão.", btn1:"Criar Conta Grátis →", btn2:"Entrar" },
    market:{ badge:"🛍️ Mates Market", h2:"Compre Mercadorias Tailandesas", sub:"Produtos tailandeses oficiais e autênticos enviados para todo o mundo.", categories:["Todos","BL/GL Oficial","Marca do Artista","K-pop","Comida & Snacks","Beleza","Moda"], searchPlaceholder:"Buscar produtos...", addCart:"Adicionar ao Carrinho", inStock:"Em Estoque", limitedStock:"Limitado" },
    club:{ badge:"⭐ Mates Club", h2:"Hub de Fãs & Notícias", sub:"Sua comunidade de entretenimento tailandês — notícias de artistas, lançamentos, eventos e ofertas exclusivas CartMates.", categories:["Todos","Notícias de Artistas","Novo Merch","Eventos","Promoções","Atualizações de Envio"], readMore:"Leia Mais →" },
    footer:{ tagline:"Seu parceiro pessoal de compras tailandesas. Levando cultura, mercadorias e marcas tailandesas para fãs ao redor do mundo.", cols:[{title:"Serviços",links:["Compra por Procuração","Armazém","Envio Internacional","Painel GOM"]},{title:"Explorar",links:["Mates Market","Mates Club","Preços","FAQ"]},{title:"Siga-nos",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates. Todos os direitos reservados.", legal:["Política de Privacidade","Termos de Serviço","Itens Proibidos"] },
  },
  es: {
    lang:"ES", flag:"🇪🇸",
    nav:{ home:"Inicio", services:"Servicios", howItWorks:"Cómo Funciona", pricing:"Precios", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"FAQ", login:"Iniciar Sesión", getStarted:"Empezar" },
    hero:{ badge:"🌏 Tailandia → Envío Mundial", h1a:"Tu Compañero", h1b:"Personal de Compras", h1c:"Tailandesas 🐰", sub:"Compra productos tailandeses fácilmente — entregados en tu puerta en cualquier parte del mundo. Merch oficial BL/GL, marcas de artistas, snacks tailandeses — ¡lo manejamos todo!", cta1:"¡Empezar Gratis! 🎉", cta2:"Cómo Funciona ↓", trust:["Pago Seguro","Verificado con Fotos","25+ Países"] },
    marquee:["🐰 ¡Descuento del 10% en el primer envío!","📦 Revisión gratuita para planes Premium & Ultimate","🌟 Merch Oficial GMMTV ahora disponible","✈️ Envío exprés disponible en 25+ países","💛 Actualiza a Ultimate y accede antes a productos exclusivos","🎁 Recomienda un amigo y gana 100 THB de crédito"],
    stats:[{n:"8+",l:"Años de Experiencia",e:"🏆"},{n:"25+",l:"Países Atendidos",e:"🌏"},{n:"10K+",l:"Clientes Satisfechos",e:"💌"}],
    services:{ badge:"✨ Lo Que Hacemos", h2a:"Todo Lo Que", h2b:"Necesitas en Un Solo Lugar", sub:"Tu socio más confiable para mercancías tailandesas — rápido, transparente y amigable.", items:[{icon:"🛒",title:"Compra por Encargo",desc:"Compra en tiendas tailandesas sin cuenta tailandesa. Compramos, verificamos y enviamos."},{icon:"🏭",title:"Almacenamiento",desc:"Almacena hasta 90 días. Consolida varios pedidos para ahorrar en envíos."},{icon:"✈️",title:"Envío Internacional",desc:"Envío a 25+ países. Múltiples socios de transporte para la mejor tarifa."},{icon:"📦",title:"Empaque Profesional",desc:"Empaque experto con fotos en cada paso. Protección con burbujas y cobertura por daños."},{icon:"📊",title:"Panel GOM",desc:"Sistema profesional de gestión de pedidos para Group Order Managers."},{icon:"🔔",title:"Seguimiento en Tiempo Real",desc:"Recibe notificaciones en cada paso, desde la llegada al almacén hasta tu puerta."}] },
    howItWorks:{ badge:"🗺️ Proceso Simple", h2a:"Solo", h2b:"4 Pasos", steps:[{n:"1",icon:"📝",t:"Regístrate",d:"Elige tu plan y regístrate online en 3 minutos. Recibe tu Smart ID al instante."},{n:"2",icon:"🛍️",t:"Compra",d:"Pide en tiendas tailandesas usando nuestra dirección de almacén."},{n:"3",icon:"📸",t:"Verificar & Empacar",d:"Fotografiamos tus artículos, empacamos profesionalmente y te enviamos la cotización."},{n:"4",icon:"🚀",t:"¡Entregado!",d:"Paga el envío, recibe tu número de seguimiento y espera tu paquete en casa."}] },
    top10:{ badge:"🔥 Más Vendidos Hoy", h2:"Top 10 Más Vendidos", sub:"Los productos más enviados desde Tailandia hoy — actualizado diariamente.", soldLabel:"vendidos" },
    upcoming:{ badge:"📅 Lo Que Viene", h2:"Últimas Actualizaciones", sub:"Noticias de artistas, lanzamientos de merch, promociones y alertas de envío — todo en un lugar.", readMore:"Leer Más →" },
    pricing:{ badge:"💎 Plan Team Mates", h2a:"Elige Tu", h2b:"Plan Ideal", sub:"Para GOM e importadores. Facturación mensual. Cuanto más envías, más ahorras.", note:"* Video antes de abrir disponible como extra · Precios incluyen IVA · 7 días de prueba gratis", cta:"Empezar" },
    faq:{ badge:"❓ FAQ", h2:"Preguntas Frecuentes", items:[{q:"¿A qué países envían?",a:"Enviamos a 25+ países incluyendo Japón, Corea del Sur, EE.UU., Australia, la mayor parte de Europa y el Sudeste Asiático."},{q:"¿Cuánto tiempo pueden estar los artículos en el almacén?",a:"Los miembros Team Mates pueden almacenar hasta 90 días. Después se aplica una tarifa de almacenamiento."},{q:"¿Qué pasa si mi artículo se daña durante el envío?",a:"Fotografiamos todo antes de empacar. Tenemos un proceso de reclamación claro y gestionamos con la transportista."},{q:"¿Puede un GOM registrarse en el plan Team Mates?",a:"¡Por supuesto! Regístrate online, completa la verificación de identidad y accede a tu panel inmediatamente."},{q:"¿Qué métodos de pago aceptan?",a:"Tarjeta de Crédito/Débito, Transferencia Bancaria, PromptPay y métodos locales para algunos países."}] },
    ctaBanner:{ h2:"¿Listo Para Empezar?", sub:"Únete a 10.000+ clientes en todo el mundo que confían en CartMates. Registro gratuito — sin cuota de inscripción.", btn1:"Crear Cuenta Gratis →", btn2:"Iniciar Sesión" },
    market:{ badge:"🛍️ Mates Market", h2:"Compra Mercancías Tailandesas", sub:"Productos tailandeses oficiales y auténticos enviados a todo el mundo.", categories:["Todos","BL/GL Oficial","Marca del Artista","K-pop","Comida & Snacks","Belleza","Moda"], searchPlaceholder:"Buscar productos...", addCart:"Agregar al Carrito", inStock:"En Stock", limitedStock:"Limitado" },
    club:{ badge:"⭐ Mates Club", h2:"Hub de Fans & Noticias", sub:"Tu comunidad de entretenimiento tailandés — noticias de artistas, lanzamientos, eventos y ofertas exclusivas CartMates.", categories:["Todos","Noticias de Artistas","Nuevo Merch","Eventos","Promociones","Actualizaciones de Envío"], readMore:"Leer Más →" },
    footer:{ tagline:"Tu compañero personal de compras tailandesas. Llevando la cultura, mercancías y marcas tailandesas a fans de todo el mundo.", cols:[{title:"Servicios",links:["Compra por Encargo","Almacén","Envío Internacional","Panel GOM"]},{title:"Explorar",links:["Mates Market","Mates Club","Precios","FAQ"]},{title:"Síguenos",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates. Todos los derechos reservados.", legal:["Política de Privacidad","Términos de Servicio","Artículos Prohibidos"] },
  },
  ko: {
    lang:"한국어", flag:"🇰🇷",
    nav:{ home:"홈", services:"서비스", howItWorks:"이용방법", pricing:"요금제", matesMarket:"Mates Market", matesClub:"Mates Club", faq:"자주 묻는 질문", login:"로그인", getStarted:"시작하기" },
    hero:{ badge:"🌏 태국 → 전 세계 배송", h1a:"나만의 태국", h1b:"쇼핑 파트너", h1c:"🐰 CartMates", sub:"태국 상품을 쉽게 구매하고 전 세계 어디에서나 집 앞까지 배송받으세요. 공식 BL/GL 굿즈, 아티스트 브랜드, 태국 스낵 — 모두 처리해 드립니다!", cta1:"무료로 시작하기! 🎉", cta2:"이용방법 보기 ↓", trust:["안전한 결제","사진 인증","25개국 이상"] },
    marquee:["🐰 신규 회원 첫 배송 10% 할인!","📦 Premium & Ultimate 플랜 무료 재검수","🌟 GMMTV 공식 굿즈 입고 완료","✈️ 25개국 이상 특급 배송 시작","💛 Ultimate로 업그레이드 — 단독 상품 선구매 혜택","🎁 친구 추천 시 100 THB 크레딧 지급"],
    stats:[{n:"8+",l:"년 경험",e:"🏆"},{n:"25+",l:"배송 국가",e:"🌏"},{n:"10K+",l:"만족 고객",e:"💌"}],
    services:{ badge:"✨ 서비스 소개", h2a:"필요한 모든 것이", h2b:"한 곳에", sub:"태국 굿즈 구매·배송의 가장 믿을 수 있는 파트너 — 빠르고, 투명하고, 친근하게.", items:[{icon:"🛒",title:"대리 구매",desc:"태국 계정 없이도 태국 쇼핑몰에서 구매 가능. 구매, 검수, 배송 모두 대행."},{icon:"🏭",title:"창고 보관",desc:"최대 90일 보관. 여러 주문을 합배송으로 배송비 절약."},{icon:"✈️",title:"국제 배송",desc:"25개국 이상 배송. 다수의 배송사 파트너로 최저가 보장."},{icon:"📦",title:"전문 포장",desc:"단계별 사진 촬영과 함께 전문 포장. 에어캡 보호와 파손 보상."},{icon:"📊",title:"GOM 대시보드",desc:"단체 주문 관리자를 위한 전문 주문 관리 시스템. Google Form 대체."},{icon:"🔔",title:"실시간 추적",desc:"창고 입고부터 문 앞 배달까지 모든 단계 알림 수신."}] },
    howItWorks:{ badge:"🗺️ 간단한 절차", h2a:"단", h2b:"4단계", steps:[{n:"1",icon:"📝",t:"회원가입",d:"플랜을 선택하고 3분 내 온라인 가입. 즉시 Smart ID 발급."},{n:"2",icon:"🛍️",t:"쇼핑",d:"창고 주소를 사용해 태국 쇼핑몰에서 주문. 직접 CartMates 창고로 배송."},{n:"3",icon:"📸",t:"검수 & 포장",d:"상품 사진 검수 후 전문 포장. 배송 견적을 알림으로 발송."},{n:"4",icon:"🚀",t:"배송 완료!",d:"배송비 결제 후 운송장 번호 수령. 집에서 수령만 하면 끝!"}] },
    top10:{ badge:"🔥 오늘의 베스트셀러", h2:"Top 10 베스트셀러", sub:"오늘 태국에서 가장 많이 발송된 상품 — 매일 업데이트", soldLabel:"개 판매" },
    upcoming:{ badge:"📅 다가오는 소식", h2:"최신 업데이트", sub:"아티스트 뉴스, 굿즈 출시, 프로모션, 배송 알림 — 모두 한 곳에서.", readMore:"더 보기 →" },
    pricing:{ badge:"💎 Team Mates 플랜", h2a:"나에게 맞는", h2b:"플랜 선택", sub:"GOM과 수입업자를 위한 플랜. 월정액. 발송량이 많을수록 더 저렴.", note:"* 개봉 전 영상은 추가 옵션 · 모든 가격 VAT 포함 · 7일 무료 체험", cta:"시작" },
    faq:{ badge:"❓ 자주 묻는 질문", h2:"자주 묻는 질문", items:[{q:"어느 나라로 배송이 가능한가요?",a:"일본, 한국, 미국, 호주, 유럽 대부분, 동남아시아를 포함한 25개국 이상에 배송합니다."},{q:"상품을 창고에 얼마나 오래 보관할 수 있나요?",a:"Team Mates 회원은 최대 90일 보관 가능. 이후 보관료가 부과됩니다."},{q:"배송 중 상품이 파손되면 어떻게 하나요?",a:"포장 전 모든 상품을 촬영합니다. 명확한 클레임 절차가 있으며 배송사 협의를 대행합니다."},{q:"GOM도 Team Mates 플랜에 가입할 수 있나요?",a:"물론입니다! 온라인 가입 후 본인인증을 완료하면 즉시 대시보드를 이용할 수 있습니다."},{q:"어떤 결제 수단을 사용할 수 있나요?",a:"신용/체크카드, 계좌이체, PromptPay, 일부 국가 현지 결제 수단을 지원합니다."}] },
    ctaBanner:{ h2:"시작할 준비가 됐나요?", sub:"전 세계 10,000명 이상의 고객이 CartMates를 신뢰합니다. 무료 가입 — 가입비 없음.", btn1:"무료 계정 만들기 →", btn2:"로그인" },
    market:{ badge:"🛍️ Mates Market", h2:"태국 굿즈 쇼핑", sub:"공식·정품 태국 상품을 전 세계로 배송. CartMates에서 직접 구매.", categories:["전체","BL/GL 공식","아티스트 브랜드","K-pop","식품 & 스낵","뷰티","패션"], searchPlaceholder:"상품 검색...", addCart:"장바구니 추가", inStock:"재고 있음", limitedStock:"한정 수량" },
    club:{ badge:"⭐ Mates Club", h2:"팬 허브 & 뉴스", sub:"태국 엔터테인먼트 커뮤니티 — 아티스트 뉴스, 앨범 발매, 이벤트 알림, CartMates 단독 혜택.", categories:["전체","아티스트 뉴스","신규 굿즈","이벤트","프로모션","배송 업데이트"], readMore:"더 보기 →" },
    footer:{ tagline:"나만의 태국 쇼핑 파트너. 전 세계 팬들에게 태국 문화, 굿즈, 브랜드를 전달합니다.", cols:[{title:"서비스",links:["대리 구매","창고 보관","국제 배송","GOM 대시보드"]},{title:"탐색",links:["Mates Market","Mates Club","요금제","자주 묻는 질문"]},{title:"팔로우",links:["Instagram","Twitter / X","Facebook","TikTok","Line OA"]}], copy:"© 2025 CartMates. All rights reserved.", legal:["개인정보 처리방침","이용약관","금지 물품"] },
  },
};

/* ══════════════════════════════ MOCK DATA ════════════════════════════════════ */
const TOP10 = [
  {id:1,name:"GMMTV Photobook Vol.3",artist:"GMMTV",price:890,sold:412,badge:"🥇",tag:"BL/GL Official",img:"📚"},
  {id:2,name:"BillKin Acoustic Tote Bag",artist:"BillKin",price:450,sold:387,badge:"🥈",tag:"Artist Brand",img:"👜"},
  {id:3,name:"OffGun Summer Merch Set",artist:"OffGun",price:1250,sold:356,badge:"🥉",tag:"BL/GL Official",img:"🎁"},
  {id:4,name:"MILLI Limited Hoodie",artist:"MILLI",price:790,sold:298,badge:"#4",tag:"Artist Brand",img:"👕"},
  {id:5,name:"Thai Milk Tea Set x12",artist:"Chatramue",price:340,sold:276,badge:"#5",tag:"Food & Snacks",img:"🧋"},
  {id:6,name:"Nanon Signature Pendant",artist:"Nanon",price:590,sold:251,badge:"#6",tag:"Artist Brand",img:"📿"},
  {id:7,name:"Bad Buddy Blanket Official",artist:"GMMTV",price:680,sold:234,badge:"#7",tag:"BL/GL Official",img:"🧣"},
  {id:8,name:"Snackbox Thai Bundle",artist:"Various",price:420,sold:218,badge:"#8",tag:"Food & Snacks",img:"🍿"},
  {id:9,name:"Jeff Satur Concert Lightstick",artist:"Jeff Satur",price:950,sold:197,badge:"#9",tag:"Artist Brand",img:"🪄"},
  {id:10,name:"Pond Phuwin Fan Set",artist:"Pond Phuwin",price:520,sold:183,badge:"#10",tag:"BL/GL Official",img:"💌"},
];

const NEWS = [
  {id:1,type:"artist",tag:"Artist News",title:"BillKin & PP Krit Announce New BL Drama",date:"Apr 28, 2025",desc:"GMMTV confirms filming starts June 2025. Pre-order merch window opens next week. CartMates will have exclusive early access for Ultimate members.",img:"🎬",hot:true},
  {id:2,type:"merch",tag:"New Merch",title:"OffGun Summer Collection 2025 Drop",date:"Apr 27, 2025",desc:"Limited summer merch set including photo frames, fan, and signed postcard. Only 500 sets available globally. Reserve yours now.",img:"✨",hot:true},
  {id:3,type:"promo",tag:"Promotions",title:"Double Shipping Discount This Weekend",date:"Apr 26, 2025",desc:"Premium members get 4% off, Ultimate members get 6% off all shipments processed Sat-Sun. Use code WEEKEND2025.",img:"🎁",hot:false},
  {id:4,type:"event",tag:"Events",title:"Jeff Satur World Tour — Asian Leg Dates",date:"Apr 25, 2025",desc:"Official dates confirmed for Bangkok, Tokyo, Seoul, and Singapore. CartMates Concert Tour Package coming soon — hotel + ticket bundle.",img:"🎤",hot:false},
  {id:5,type:"shipping",tag:"Shipping Updates",title:"New Carrier Partner: DHL Express Thailand",date:"Apr 24, 2025",desc:"CartMates now offers DHL Express for priority door-to-door delivery to 50+ countries with real-time tracking.",img:"✈️",hot:false},
  {id:6,type:"merch",tag:"New Merch",title:"MILLI 'Water' Album Physical CD — Pre-order",date:"Apr 23, 2025",desc:"Official CD with photocard and exclusive sticker set. Pre-orders ship May 15. CartMates warehouse ready for consolidation.",img:"💿",hot:false},
];

const MARKET_PRODS = [
  {id:1,name:"GMMTV Photobook Vol.3",artist:"GMMTV",price:890,tag:"BL/GL Official",stock:"in",img:"📚",rating:4.9},
  {id:2,name:"BillKin Tote Bag",artist:"BillKin",price:450,tag:"Artist Brand",stock:"limited",img:"👜",rating:4.8},
  {id:3,name:"OffGun Summer Set",artist:"OffGun",price:1250,tag:"BL/GL Official",stock:"limited",img:"🎁",rating:5.0},
  {id:4,name:"Thai Milk Tea x12",artist:"Chatramue",price:340,tag:"Food & Snacks",stock:"in",img:"🧋",rating:4.7},
  {id:5,name:"Jeff Satur Lightstick",artist:"Jeff Satur",price:950,tag:"Artist Brand",stock:"in",img:"🪄",rating:4.9},
  {id:6,name:"MILLI Limited Hoodie",artist:"MILLI",price:790,tag:"Artist Brand",stock:"limited",img:"👕",rating:4.6},
  {id:7,name:"Bad Buddy Blanket",artist:"GMMTV",price:680,tag:"BL/GL Official",stock:"in",img:"🧣",rating:4.8},
  {id:8,name:"Nanon Pendant Silver",artist:"Nanon",price:590,tag:"Artist Brand",stock:"in",img:"📿",rating:4.7},
];

const PACKAGES = [
  {id:"standard",name:"Standard",price:900,color:"#0484CF",headerBg:"#0484CF",features:[{t:"Photo on box open",ok:true},{t:"Bubble-wrap unpack",ok:false},{t:"Recheck: ฿10/tracking",ok:false,note:true},{t:"Shipping discount",ok:false},{t:"Order dashboard",ok:true},{t:"Priority purchase access",ok:false}]},
  {id:"premium",name:"Premium",price:1200,badge:"🔥 Most Popular",color:"#075BB0",headerBg:"#075BB0",features:[{t:"Photo on box open",ok:true},{t:"Bubble-wrap unpack",ok:false},{t:"Free recheck service",ok:true},{t:"2% shipping discount",ok:true},{t:"Order dashboard",ok:true},{t:"Priority purchase access",ok:false}]},
  {id:"ultimate",name:"Ultimate",price:1500,badge:"⭐ VIP",color:"#075BB0",headerBg:"linear-gradient(135deg,#075BB0 0%,#0484CF 35%,#FFEB59 75%,#FFD700 100%)",features:[{t:"Full item photo check",ok:true},{t:"Free recheck service",ok:true},{t:"3% shipping discount",ok:true},{t:"Order dashboard",ok:true},{t:"Priority purchase + special prices",ok:true},{t:"Exclusive early access",ok:true}]},
];

/* ══════════════════════════════ HELPERS ═════════════════════════════════════ */
const TAG_COLORS = {
  "Artist News":["#EFF6FF","#075BB0"],
  "New Merch":["#FFF7ED","#D97706"],
  "Events":["#F0FDF4","#16A34A"],
  "Promotions":["#FEF9C3","#CA8A04"],
  "Shipping Updates":["#F5F3FF","#7C3AED"],
};

function SectionBadge({ children }) {
  return <div style={{ display:"inline-block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"5px 14px", borderRadius:20, marginBottom:12, letterSpacing:"0.02em" }}>{children}</div>;
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{ background:"white", borderRadius:14, marginBottom:10, border:`2px solid ${open?C.primary:"#E2E8F0"}`, cursor:"pointer", overflow:"hidden", transition:"border-color 0.2s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 18px" }}>
        <span style={{ fontWeight:800, fontSize:14, color:C.text, flex:1, lineHeight:1.4, paddingRight:12 }}>{q}</span>
        <span style={{ fontSize:22, color:C.primary, transform:open?"rotate(45deg)":"none", transition:"transform 0.3s", flexShrink:0 }}>+</span>
      </div>
      {open && <div style={{ padding:"0 18px 16px", fontSize:13.5, color:C.muted, lineHeight:1.8 }}>{a}</div>}
    </div>
  );
}

function ServiceCard({ icon, title, desc, color }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{ background:h?color:"white", border:`2px solid ${h?color:"#E2E8F0"}`, borderRadius:18, padding:"24px 20px", transition:"all 0.3s", transform:h?"translateY(-5px)":"none", boxShadow:h?`0 16px 36px ${color}33`:"0 2px 10px rgba(0,0,0,0.05)" }}>
      <div style={{ width:54, height:54, borderRadius:14, background:h?"rgba(255,255,255,0.2)":`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:16 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:800, color:h?"white":C.text, marginBottom:8 }}>{title}</div>
      <div style={{ fontSize:13.5, color:h?"rgba(255,255,255,0.85)":C.muted, lineHeight:1.7 }}>{desc}</div>
    </div>
  );
}

/* ══════════════════════════════ RABBIT SVG ═══════════════════════════════════ */
function Rabbit({ size=200 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="155" cy="258" rx="72" ry="10" fill="#075BB0" fillOpacity="0.13"/>
      <rect x="110" y="170" width="95" height="58" rx="10" fill="#FFEB59" stroke="#075BB0" strokeWidth="3"/>
      <rect x="116" y="178" width="83" height="44" rx="6" fill="#FFF9C4" stroke="#075BB0" strokeWidth="1.5"/>
      <path d="M108 180 Q98 165 90 155" stroke="#075BB0" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="130" cy="233" r="13" fill="#075BB0"/><circle cx="130" cy="233" r="7" fill="#FFEB59"/>
      <circle cx="182" cy="233" r="13" fill="#075BB0"/><circle cx="182" cy="233" r="7" fill="#FFEB59"/>
      <line x1="130" y1="226" x2="130" y2="240" stroke="#075BB0" strokeWidth="2"/>
      <line x1="123" y1="233" x2="137" y2="233" stroke="#075BB0" strokeWidth="2"/>
      <line x1="182" y1="226" x2="182" y2="240" stroke="#075BB0" strokeWidth="2"/>
      <line x1="175" y1="233" x2="189" y2="233" stroke="#075BB0" strokeWidth="2"/>
      <rect x="125" y="155" width="48" height="38" rx="5" fill="#0484CF" stroke="#075BB0" strokeWidth="2"/>
      <line x1="149" y1="155" x2="149" y2="193" stroke="#FFEB59" strokeWidth="2"/>
      <line x1="125" y1="174" x2="173" y2="174" stroke="#FFEB59" strokeWidth="2"/>
      <ellipse cx="85" cy="175" rx="28" ry="32" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <ellipse cx="85" cy="181" rx="16" ry="18" fill="#FDE8F0"/>
      <circle cx="85" cy="128" r="30" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <circle cx="70" cy="134" r="7" fill="#FFCDD8" fillOpacity="0.6"/>
      <circle cx="100" cy="134" r="7" fill="#FFCDD8" fillOpacity="0.6"/>
      <ellipse cx="70" cy="91" rx="10" ry="26" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <ellipse cx="70" cy="91" rx="5" ry="20" fill="#FDE8F0"/>
      <ellipse cx="100" cy="88" rx="10" ry="26" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <ellipse cx="100" cy="88" rx="5" ry="20" fill="#FDE8F0"/>
      <circle cx="76" cy="124" r="5" fill="#075BB0"/><circle cx="94" cy="124" r="5" fill="#075BB0"/>
      <circle cx="78" cy="122" r="2" fill="white"/><circle cx="96" cy="122" r="2" fill="white"/>
      <ellipse cx="85" cy="133" rx="4" ry="3" fill="#FF8FAB"/>
      <path d="M81 136 Q85 140 89 136" stroke="#075BB0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M60 165 Q72 158 90 163" stroke="#075BB0" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <ellipse cx="74" cy="204" rx="12" ry="8" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <ellipse cx="96" cy="204" rx="12" ry="8" fill="white" stroke="#075BB0" strokeWidth="2.5"/>
      <line x1="38" y1="155" x2="18" y2="155" stroke="#0484CF" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="34" y1="165" x2="10" y2="165" stroke="#FFEB59" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ══════════════════════════════ TOP 10 CAROUSEL ═════════════════════════════ */
function Top10Carousel({ t, onRegister, gotoPage, BY }) {
  const trackRef = useRef(null);
  const [canLeft,  setCanLeft ] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const CARD_W = 196; // card width + gap
  const GAP    = 14;

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (CARD_W + GAP) * 3, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  };

  const rankStyle = (i) => {
    if (i === 0) return { background:"linear-gradient(135deg,#FFD700,#FFA500)", color:"white" };
    if (i === 1) return { background:"linear-gradient(135deg,#C0C0C0,#A0A0A0)", color:"white" };
    if (i === 2) return { background:"linear-gradient(135deg,#CD7F32,#A06030)", color:"white" };
    return { background:"#F1F5F9", color:C.muted };
  };

  return (
    <section style={{ padding:"64px 0", background:"white", overflow:"hidden" }}>
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"inline-block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"4px 14px", borderRadius:20, marginBottom:10 }}>{t.top10.badge}</div>
            <h2 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.text, lineHeight:1.1, margin:0 }}>{t.top10.h2}</h2>
            <p style={{ fontSize:14, color:C.muted, marginTop:6 }}>{t.top10.sub}</p>
          </div>
          {/* Arrow buttons */}
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={()=>scroll(-1)} disabled={!canLeft}
              style={{ width:44, height:44, borderRadius:"50%", border:`2px solid ${canLeft?C.primary:"#E2E8F0"}`, background:canLeft?C.primary:"white", color:canLeft?"white":C.muted, fontSize:20, cursor:canLeft?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 }}>
              ‹
            </button>
            <button onClick={()=>scroll(1)} disabled={!canRight}
              style={{ width:44, height:44, borderRadius:"50%", border:`2px solid ${canRight?C.primary:"#E2E8F0"}`, background:canRight?C.primary:"white", color:canRight?"white":C.muted, fontSize:20, cursor:canRight?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 }}>
              ›
            </button>
          </div>
        </div>

        {/* Scrollable track — no scrollbar */}
        <div style={{ position:"relative" }}>
          {/* Left fade */}
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:40, background:"linear-gradient(90deg,white,transparent)", zIndex:2, pointerEvents:"none", opacity:canLeft?1:0, transition:"opacity 0.2s" }}/>
          {/* Right fade */}
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:40, background:"linear-gradient(270deg,white,transparent)", zIndex:2, pointerEvents:"none", opacity:canRight?1:0, transition:"opacity 0.2s" }}/>

          <div ref={trackRef} onScroll={updateArrows}
            style={{ display:"flex", gap:GAP, overflowX:"auto", scrollBehavior:"smooth", paddingBottom:4,
                     scrollbarWidth:"none", msOverflowStyle:"none" }}>
            <style>{`.top10-track::-webkit-scrollbar{display:none}`}</style>

            {TOP10.map((p,i)=>(
              <div key={p.id} onClick={onRegister}
                style={{ flexShrink:0, width:CARD_W, background:"white", borderRadius:16,
                         border:"1.5px solid #E2E8F0", overflow:"hidden",
                         boxShadow:"0 2px 10px rgba(0,0,0,0.06)", cursor:"pointer",
                         transition:"all 0.22s ease" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 12px 28px rgba(7,91,176,0.13)`; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.06)"; }}
              >
                {/* Image area */}
                <div style={{ background:`linear-gradient(135deg,${C.bg},#E8F4FD)`, height:130, display:"flex", alignItems:"center", justifyContent:"center", fontSize:46, position:"relative" }}>
                  {p.img}
                  {/* Rank badge */}
                  <span style={{ position:"absolute", top:8, left:8, ...rankStyle(i), fontSize:i<3?11:10, fontWeight:900, padding:"3px 9px", borderRadius:8, lineHeight:1.4 }}>
                    {i===0?"🏆 #1": i===1?"🥈 #2": i===2?"🥉 #3":`#${p.rank}`}
                  </span>
                </div>
                {/* Card body */}
                <div style={{ padding:"12px 14px" }}>
                  <div style={{ fontSize:10, color:C.action, fontWeight:800, marginBottom:3 }}>{p.tag}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, lineHeight:1.3, marginBottom:8,
                                overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                    {p.name}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontWeight:900, fontSize:15, color:C.primary }}>฿{p.price}</span>
                    <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{p.sold} {t.top10.soldLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View all button */}
        <div style={{ textAlign:"center", marginTop:28 }}>
          <button style={{...BY, padding:"12px 32px", background:C.yellow, color:C.text, border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit"}}
            onClick={()=>gotoPage("market")}>
            {t.nav.matesMarket} — View All →
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ WHY CHOOSE CARTMATES ════════════════════════════════ */
function WhyCartMates({ t, onRegister, BY }) {
  const WHY = [
    { icon:"🛡️", title:"Photo-Verified Every Step",  desc:"We photograph your items on arrival, during packing, and before dispatch — so you always know exactly what's inside.", color:C.action },
    { icon:"💰", title:"Best Shipping Rates",         desc:"We negotiate bulk rates with 10+ carriers so you always get the cheapest price per destination.", color:"#059669" },
    { icon:"🤝", title:"Fan-First Service",           desc:"We've been in the fan community for 8+ years. We speak your language and understand what matters most.", color:"#7C3AED" },
    { icon:"📊", title:"Transparent Dashboard",       desc:"See every parcel, every tracking number, and every cost in one clean dashboard. No surprises.", color:C.primary },
    { icon:"🌏", title:"25+ Countries Covered",       desc:"From Japan to Brazil, South Korea to Germany — if fans live there, we ship there.", color:"#D97706" },
    { icon:"⚡", title:"Fast Turnaround",             desc:"Most packages are processed within 24 hours of arrival at our warehouse.", color:"#DC2626" },
  ];
  return (
    <section style={{ padding:"60px 24px", background:`linear-gradient(180deg,white 0%,${C.bg} 100%)` }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"5px 14px", borderRadius:20, marginBottom:12 }}>💡 Why CartMates?</div>
          <h2 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.text, marginBottom:10 }}>
            Why 10,000+ fans choose <span style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>CartMates</span>
          </h2>
          <p style={{ fontSize:15, color:C.muted, maxWidth:460, margin:"0 auto" }}>More than a forwarding service — we're your personal Thai shopping companion.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
          {WHY.map((w,i)=>(
            <div key={i} style={{ background:"#0484CF", borderRadius:16, padding:"22px 20px", boxShadow:"0 4px 16px rgba(4,132,207,0.3)", display:"flex", gap:14, alignItems:"flex-start", transition:"all 0.22s", cursor:"default" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#075BB0"; e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 12px 28px rgba(7,91,176,0.35)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#0484CF"; e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 16px rgba(4,132,207,0.3)"; }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{w.icon}</div>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:"white", marginBottom:5 }}>{w.title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", lineHeight:1.65 }}>{w.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:36 }}>
          <button onClick={onRegister} style={{...BY, background:C.yellow, color:C.text, border:"none", borderRadius:12, padding:"13px 36px", fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"inherit"}}>
            Join 10,000+ Mates — It's Free! 🐰
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ FULL-PAGE: SERVICES ═════════════════════════════════ */
function ServicesPage({ t, gotoPage }) {
  const cols = [C.action, C.primary, "#7C3AED", "#059669", "#DC2626", "#D97706"];
  return (
    <div style={{ minHeight:"80vh" }}>
      <div style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"52px 24px 44px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <button onClick={()=>gotoPage("home")} style={{ background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", color:"white", borderRadius:9, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>← Back to Home</button>
          <div style={{ display:"inline-block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"4px 14px", borderRadius:20, marginBottom:12, display:"block" }}>{t.services.badge}</div>
          <h1 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(28px,5vw,44px)", fontWeight:900, color:"white", marginBottom:10 }}>{t.services.h2a} {t.services.h2b}</h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.85)", maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>{t.services.sub}</p>
        </div>
      </div>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"44px 24px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:22 }}>
          {t.services.items.map((s,i)=>(
            <div key={i} style={{ background:"white", borderRadius:20, padding:"28px 24px", border:`1.5px solid #E2E8F0`, boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
              <div style={{ width:60, height:60, borderRadius:16, background:`${cols[i%cols.length]}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:18 }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:18, color:C.text, marginBottom:10 }}>{s.title}</div>
              <div style={{ fontSize:14, color:C.muted, lineHeight:1.75, marginBottom:16 }}>{s.desc}</div>
              <div style={{ width:40, height:3, borderRadius:2, background:cols[i%cols.length] }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ FULL-PAGE: HOW IT WORKS ═════════════════════════════ */
function HowItWorksPage({ t, onRegister, gotoPage, BY }) {
  return (
    <div style={{ minHeight:"80vh" }}>
      <div style={{ background:`linear-gradient(135deg,#1A1A2E,${C.primary})`, padding:"52px 24px 44px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <button onClick={()=>gotoPage("home")} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"white", borderRadius:9, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>← Back to Home</button>
          <div style={{ display:"block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"4px 14px", borderRadius:20, marginBottom:12, display:"inline-block" }}>{t.howItWorks.badge}</div>
          <h1 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(28px,5vw,44px)", fontWeight:900, color:"white", marginBottom:10 }}>{t.howItWorks.h2a} {t.howItWorks.h2b}</h1>
        </div>
      </div>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"44px 24px" }}>
        {t.howItWorks.steps.map((s,i)=>(
          <div key={i} style={{ display:"flex", gap:20, marginBottom:28, alignItems:"flex-start" }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:22, color:C.text, flexShrink:0, boxShadow:`0 4px 16px ${C.yellow}66` }}>{s.n}</div>
            <div style={{ background:"white", borderRadius:16, padding:"20px 24px", flex:1, boxShadow:"0 4px 18px rgba(0,0,0,0.07)", border:"1.5px solid #E2E8F0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <span style={{ fontWeight:800, fontSize:18, color:C.text }}>{s.t}</span>
              </div>
              <div style={{ fontSize:14.5, color:C.muted, lineHeight:1.75 }}>{s.d}</div>
            </div>
          </div>
        ))}
        <div style={{ textAlign:"center", marginTop:36 }}>
          <button onClick={onRegister} style={{...BY, background:C.yellow, color:C.text, border:"none", borderRadius:12, padding:"14px 40px", fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:"inherit"}}>
            Start Your Journey — Free 🐰
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ FULL-PAGE: PRICING ══════════════════════════════════ */
function PricingPage({ t, onRegister, gotoPage, BY }) {
  return (
    <div style={{ minHeight:"80vh" }}>
      <div style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"52px 24px 44px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <button onClick={()=>gotoPage("home")} style={{ background:"rgba(255,255,255,0.18)", border:"1px solid rgba(255,255,255,0.3)", color:"white", borderRadius:9, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>← Back to Home</button>
          <div style={{ display:"inline-block", background:C.yellow, color:C.text, fontWeight:800, fontSize:12, padding:"4px 14px", borderRadius:20, marginBottom:12 }}>{t.pricing.badge}</div>
          <h1 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(28px,5vw,44px)", fontWeight:900, color:"white", marginBottom:10 }}>{t.pricing.h2a} {t.pricing.h2b}</h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.85)", maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>{t.pricing.sub}</p>
        </div>
      </div>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"44px 24px" }}>
        <div style={{ display:"flex", gap:22, justifyContent:"center", flexWrap:"wrap", alignItems:"flex-start" }}>
          {PACKAGES.map(pkg=>{
            const isP = pkg.id==="premium";
            const isU = pkg.id==="ultimate";
            return (
              <div key={pkg.id} style={{ width:"min(320px,100%)", borderRadius:22, border:`2.5px solid ${pkg.color}`, overflow:"hidden", background:"white", boxShadow:isP?`0 20px 60px ${pkg.color}28`:isU?`0 12px 36px rgba(7,91,176,0.18)`:"0 4px 20px rgba(0,0,0,0.07)", position:"relative", transform:isP?"scale(1.03)":"none" }}>
                {pkg.badge && <div style={{ position:"absolute", top:14, right:14, background:C.yellow, color:C.text, fontWeight:900, fontSize:11, padding:"4px 11px", borderRadius:16 }}>{pkg.badge}</div>}
                <div style={{ background:pkg.headerBg, padding:"28px 24px 22px", color:"white" }}>
                  <div style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:28, fontWeight:900, marginBottom:8 }}>{pkg.name}</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:8 }}>
                    <span style={{ fontSize:42, fontWeight:900, lineHeight:1 }}>฿{pkg.price.toLocaleString()}</span>
                    <span style={{ fontSize:14, opacity:0.85 }}>/month</span>
                  </div>
                  <div style={{ fontSize:13, opacity:0.85 }}>Billed monthly · Cancel anytime</div>
                </div>
                <div style={{ padding:"20px 24px 8px" }}>
                  {pkg.features.map((f,fi)=>(
                    <div key={fi} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid #F1F5F9" }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>{f.ok?"✅":"❌"}</span>
                      <span style={{ fontSize:13.5, color:f.ok?C.text:"#94A3B8", lineHeight:1.4 }}>{f.t}{f.note&&<span style={{color:C.action,fontWeight:800}}> *</span>}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"16px 24px 24px" }}>
                  <button onClick={onRegister} style={{...BY, background:C.yellow, color:C.text, border:"none", borderRadius:11, padding:"13px", width:"100%", fontWeight:900, cursor:"pointer", fontFamily:"inherit", fontSize:15}}>
                    Get {pkg.name} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign:"center", marginTop:28, color:C.muted, fontSize:13 }}>{t.pricing.note}</p>

        {/* Add-on table */}
        <div style={{ maxWidth:600, margin:"40px auto 0", background:"white", borderRadius:18, border:"1.5px solid #E2E8F0", overflow:"hidden", boxShadow:"0 4px 18px rgba(0,0,0,0.06)" }}>
          <div style={{ background:C.primary, padding:"16px 24px", color:"white", fontWeight:800, fontSize:16 }}>📋 Add-on Services</div>
          {[["📹 Video before unboxing","฿30 / tracking"],["📦 Extra bubble-wrap protection","฿20 / item"],["🔍 Item recheck (Standard plan)","฿10 / tracking"],["🏷️ Custom gift message","฿15 / order"]].map(([name,price],i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"14px 24px", borderBottom:"1px solid #F1F5F9", fontSize:14 }}>
              <span style={{ color:C.text }}>{name}</span>
              <span style={{ fontWeight:800, color:C.primary }}>{price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ FLOATING SUBNAV (appears after hero scroll) ═════════ */
function FloatingSubNav({ t, page, gotoPage, scrollToId, scrolled }) {
  if (!scrolled || page !== "home") return null;

  const items = [
    { label: t.nav.services,    action: ()=>scrollToId("services") },
    { label: t.nav.howItWorks,  action: ()=>scrollToId("hiw") },
    { label: t.nav.pricing,     action: ()=>scrollToId("pricing") },
    { label: t.nav.matesMarket, action: ()=>gotoPage("market") },
    { label: t.nav.matesClub,   action: ()=>gotoPage("club") },
    { label: t.nav.faq,         action: ()=>scrollToId("faq") },
  ];

  return (
    <div className="sidebar-nav">
      <div className="sidebar-nav-inner">
        {items.map((item, i) => (
          <button key={i} className="sidebar-tab" onClick={item.action}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════ MAIN ════════════════════════════════════════ */
export default function LandingPage({ onLogin, onRegister, smUser, onSmLogout }) {
  const [lang, setLang]         = useState("en");
  const [page, setPage]         = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mktCat, setMktCat]     = useState(0);
  const [clubCat, setClubCat]   = useState(0);
  const [search, setSearch]     = useState("");

  // ── Cart state (persisted in localStorage for guests) ──────────────────────
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cm_cart") || "[]"); } catch { return []; }
  });
  const [cartOpen, setCartOpen]         = useState(false);
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [addedId, setAddedId]           = useState(null); // flash feedback

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (prod) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === prod.id);
      const next = existing
        ? prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
        : [...prev, { id: prod.id, name: prod.name, price: prod.price, img: prod.img, tag: prod.tag, qty: 1 }];
      localStorage.setItem("cm_cart", JSON.stringify(next));
      return next;
    });
    setAddedId(prod.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem("cm_cart", JSON.stringify(next));
      return next;
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const next = prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
      localStorage.setItem("cm_cart", JSON.stringify(next));
      return next;
    });
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // ── Checkout state ─────────────────────────────────────────────────────────
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrderNo, setConfirmedOrderNo] = useState(null);

  const clearCartAfterOrder = () => {
    setCart([]);
    localStorage.removeItem("cm_cart");
  };

  const handleCheckout = () => {
    setCartOpen(false);
    if (smUser) {
      // Logged-in SM customer → go straight to checkout
      setCheckoutOpen(true);
    } else {
      // Guest → bounce to login gate
      setLoginGateOpen(true);
    }
  };

  const t = T[lang];

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", h);
    h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  // close dropdowns on outside click
  useEffect(() => {
    const h = () => { setLangOpen(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const gotoPage = (p) => {
    setPage(p); setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const scrollTo = (id) => {
    setPage("home"); setMobileOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" }), 80);
  };

  const LANGS = [
    {key:"en",label:"English",flag:"🇬🇧"},
    {key:"th",label:"ภาษาไทย",flag:"🇹🇭"},
    {key:"zh",label:"中文",flag:"🇨🇳"},
    {key:"ja",label:"日本語",flag:"🇯🇵"},
    {key:"pt",label:"Português",flag:"🇧🇷"},
    {key:"es",label:"Español",flag:"🇪🇸"},
    {key:"ko",label:"한국어",flag:"🇰🇷"},
  ];

  const filteredProds = MARKET_PRODS.filter(p => {
    const cats = t.market.categories;
    const cm = mktCat === 0 || p.tag === cats[mktCat];
    const sm = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.artist.toLowerCase().includes(search.toLowerCase());
    return cm && sm;
  });
  const filteredNews = NEWS.filter(n => clubCat === 0 || n.tag === t.club.categories[clubCat]);

  /* ── button style helpers ── */
  const BY = { background:C.yellow, color:C.text, border:"none", borderRadius:12, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 4px 14px ${C.yellow}77`, transition:"all 0.2s", padding:"12px 24px" };
  const BO = { background:"transparent", border:`2px solid ${C.primary}`, color:C.primary, borderRadius:12, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s", padding:"10px 20px" };

  return (
    <div style={{ fontFamily:"'Nunito','Poppins',sans-serif", background:C.bg, color:C.text, overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}

        /* ── Animations ── */
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        .rabbit-anim{animation:float 3.5s ease-in-out infinite;}
        .fu{animation:fadeUp 0.6s ease both;}
        .fu1{animation:fadeUp 0.6s 0.1s ease both;}
        .fu2{animation:fadeUp 0.6s 0.2s ease both;}
        .fu3{animation:fadeUp 0.6s 0.3s ease both;}
        .fu4{animation:fadeUp 0.6s 0.4s ease both;}

        /* ── Ticker ── */
        .ticker-wrap{overflow:hidden;background:${C.primary};padding:10px 0;}
        .ticker-inner{display:flex;white-space:nowrap;width:max-content;animation:ticker 32s linear infinite;}
        .ticker-inner:hover{animation-play-state:paused;}
        .ticker-item{display:inline-flex;align-items:center;padding:0 32px;color:white;font-size:13.5px;font-weight:700;gap:6px;}

        /* ── Cards hover ── */
        .prod-card{transition:all 0.25s;cursor:pointer;}
        .prod-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(7,91,176,0.13)!important;}
        .news-card{transition:all 0.25s;cursor:pointer;}
        .news-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.09)!important;}
        .pkg-card{transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);}
        .pkg-card:hover{transform:translateY(-7px)!important;}
        .pkg-pop{transform:scale(1.03);}
        .pkg-pop:hover{transform:scale(1.03) translateY(-7px)!important;}

        /* ── Buttons ── */
        .by:hover{transform:translateY(-2px) scale(1.03)!important;box-shadow:0 8px 24px rgba(255,235,89,0.5)!important;}
        .bo:hover{background:${C.primary}!important;color:white!important;}
        .bw:hover{background:rgba(255,255,255,0.2)!important;}

        /* ── Nav link ── */
        .nl{cursor:pointer;font-weight:700;font-size:14px;padding:6px 0;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap;color:${C.text};}
        .nl:hover,.nl.act{color:${C.action}!important;border-bottom-color:${C.yellow};}

        /* ── Mobile menu ── */
        .mob-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:150;animation:fadeIn 0.2s ease;}
        .mob-drawer{position:fixed;top:0;right:0;height:100%;width:min(80vw,300px);background:white;z-index:200;overflow-y:auto;animation:slideDown 0.25s ease;display:flex;flex-direction:column;}
        .mob-nl{padding:14px 24px;font-size:15px;font-weight:700;border-bottom:1px solid #F1F5F9;cursor:pointer;transition:background 0.15s;color:${C.text};}
        .mob-nl:hover,.mob-nl.act{background:${C.bg};color:${C.action};}

        /* ── Lang dropdown ── */
        .ld{position:absolute;top:calc(100% + 8px);right:0;background:white;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.15);border:1.5px solid #E2E8F0;z-index:300;min-width:160px;overflow:hidden;}
        .lo{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13.5px;font-weight:700;cursor:pointer;transition:background 0.15s;}
        .lo:hover{background:${C.bg};}
        .lo.sel{background:#EFF6FF;color:${C.primary};}

        /* ── Category pills ── */
        .cat-pill{border:none;border-radius:20px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.18s;font-family:inherit;white-space:nowrap;}
        .cat-pill:hover{opacity:0.85;}

        /* ── Gradient text ── */
        .gt{background:linear-gradient(135deg,${C.primary},${C.action});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

        /* ── Floating top subnav ── */
        @keyframes sidebarIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        .sidebar-nav{
          position:fixed;
          top:62px;
          left:0;right:0;
          z-index:99;
          background:#FFEB59;
          border-bottom:2px solid #E8C800;
          box-shadow:0 3px 12px rgba(0,0,0,0.12);
          animation:sidebarIn 0.25s ease both;
          overflow-x:auto;
          scrollbar-width:none;
        }
        .sidebar-nav::-webkit-scrollbar{display:none;}
        .sidebar-tab{
          display:inline-flex;
          align-items:center;
          background:transparent;
          color:#0484CF;
          border:none;
          cursor:pointer;
          font-family:inherit;
          font-size:12.5px;
          font-weight:800;
          padding:9px 16px;
          white-space:nowrap;
          transition:background 0.15s,color 0.15s;
          border-bottom:2.5px solid transparent;
          letter-spacing:0.01em;
          flex-shrink:0;
        }
        .sidebar-tab:hover{background:rgba(4,132,207,0.12);color:#075BB0;border-bottom-color:#0484CF;}
        .sidebar-nav-inner{display:flex;max-width:1280px;margin:0 auto;padding:0 12px;}
        @media(max-width:480px){.sidebar-tab{font-size:11px;padding:8px 11px;}}

        /* ── Scrollbar for cat row ── */
        .cat-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .cat-row::-webkit-scrollbar{display:none;}

        /* ── Article row hover ── */
        .article-row:hover{background:${C.bg}!important;border-color:${C.primary}!important;box-shadow:0 6px 20px rgba(7,91,176,0.1)!important;}

        /* ── Hide scrollbar on carousel track ── */
        .top10-track::-webkit-scrollbar{display:none;}

        /* ── Subnav offset for anchor scroll ── */
        [id]{scroll-margin-top:110px;}

        /* ═══════════ RESPONSIVE BREAKPOINTS ═══════════ */

        /* Tablets ≤ 900px */
        @media(max-width:900px){
          .hide-900{display:none!important;}
          .show-900{display:flex!important;}
          .upcoming-layout{grid-template-columns:1fr!important;}
        }

        /* Mobile ≤ 640px */
        @media(max-width:640px){
          /* Hero */
          .hero-inner{flex-direction:column!important;text-align:center;padding:36px 16px 100px!important;}
          .hero-h1{font-size:30px!important;line-height:1.15!important;}
          .hero-sub{font-size:14px!important;}
          .hero-cta{justify-content:center!important;flex-wrap:wrap;}
          .hero-trust{justify-content:center!important;}
          .hero-rabbit{display:none!important;}

          /* Stats bar — compact on mobile */
          .stats-row{gap:0!important;}
          .stat-card{padding:6px 10px!important;min-width:0!important;flex:1!important;}
          .stat-card .stat-num{font-size:16px!important;}
          .stat-card .stat-lbl{font-size:10px!important;}
          .stat-card .stat-ico{font-size:16px!important;}

          /* Sections */
          .sec-pad{padding:40px 16px!important;}
          .sec-h2{font-size:24px!important;}

          /* Services — compact 2 cols, no hover cards */
          .svc-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}
          .svc-grid > div{padding:16px 12px!important;border-radius:12px!important;}
          .svc-grid > div > div:first-child{width:40px!important;height:40px!important;font-size:20px!important;margin-bottom:10px!important;}
          .svc-grid > div > div:nth-child(2){font-size:13px!important;}
          .svc-grid > div > div:nth-child(3){font-size:12px!important;}

          /* Steps */
          .steps-row{flex-direction:column!important;gap:14px!important;}
          .step-conn{display:none!important;}

          /* Packages */
          .pkg-grid{flex-direction:column!important;align-items:stretch!important;}
          .pkg-card{width:100%!important;transform:none!important;}
          .pkg-pop{transform:none!important;}
          .pkg-pop:hover{transform:translateY(-7px)!important;}

          /* News / upcoming — compact */
          .news-grid{grid-template-columns:1fr!important;}
          .upcoming-layout{grid-template-columns:1fr!important;}
          .upcoming-img-panel{display:none!important;}
          .article-row{padding:12px 14px!important;gap:10px!important;}
          .article-row > div:first-child{width:36px!important;height:36px!important;font-size:18px!important;}

          /* Market */
          .mkt-grid{grid-template-columns:repeat(2,1fr)!important;}

          /* Footer */
          .footer-inner{flex-direction:column!important;gap:24px!important;}

          /* CTA */
          .cta-btns{flex-direction:column!important;align-items:center!important;}
          .cta-btns button{width:100%;max-width:280px;}

          /* Nav */
          .nav-auth{gap:6px!important;}
          .nav-auth .login-btn{display:none!important;}

          /* Why section — single col */
          .why-grid{grid-template-columns:1fr!important;}
        }

        /* Very small ≤ 380px */
        @media(max-width:380px){
          .hero-h1{font-size:26px!important;}
          .mkt-grid{grid-template-columns:1fr!important;}
          .svc-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      {/* ═══════════════════════════════ NAV ═══════════════════════════════ */}
      {/* Spacer so fixed nav doesn't cover content */}
      <div style={{ height: 62 }}/>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"white", boxShadow:scrolled?"0 2px 20px rgba(7,91,176,0.1)":"0 1px 0 #E2E8F0", transition:"box-shadow 0.3s" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", height:62, gap:12 }}>

          {/* Logo */}
          <div onClick={()=>gotoPage("home")} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🐰</div>
            <span style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:19, fontWeight:900, color:C.primary, letterSpacing:"-0.02em" }}>CARTMATES</span>
          </div>

          {/* Desktop links */}
          <div className="hide-900" style={{ display:"flex", gap:18, alignItems:"center", flex:1, justifyContent:"center" }}>
            {[
              {l:t.nav.home,   fn:()=>gotoPage("home"),  k:"home"},
              {l:t.nav.services,   fn:()=>scrollTo("services"),  k:"svc"},
              {l:t.nav.howItWorks, fn:()=>scrollTo("hiw"),        k:"hiw"},
              {l:t.nav.pricing,    fn:()=>scrollTo("pricing"),    k:"price"},
              {l:t.nav.matesMarket,fn:()=>gotoPage("market"),     k:"market"},
              {l:t.nav.matesClub,  fn:()=>gotoPage("club"),       k:"club"},
              {l:t.nav.faq,        fn:()=>scrollTo("faq"),        k:"faq"},
            ].map(item=>(
              <span key={item.k} className={`nl${page===item.k?" act":""}`} onClick={item.fn}>{item.l}</span>
            ))}
          </div>

          {/* Right: lang + auth + hamburger */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }} className="nav-auth">
            {/* Lang picker */}
            <div style={{ position:"relative" }} onClick={e=>{e.stopPropagation();setLangOpen(!langOpen);}}>
              <button style={{ display:"flex", alignItems:"center", gap:5, background:"transparent", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"6px 10px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {LANGS.find(l=>l.key===lang)?.flag} {T[lang].lang} ▾
              </button>
              {langOpen && (
                <div className="ld" onClick={e=>e.stopPropagation()}>
                  {LANGS.map(l=>(
                    <div key={l.key} className={`lo${lang===l.key?" sel":""}`} onClick={()=>{setLang(l.key);setLangOpen(false);}}>
                      <span>{l.flag}</span><span>{l.label}</span>
                      {lang===l.key&&<span style={{marginLeft:"auto",color:C.action}}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart icon */}
            <div style={{ position:"relative", cursor:"pointer", flexShrink:0 }} onClick={()=>setCartOpen(true)}>
              <div style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${cartCount>0?C.primary:"#E2E8F0"}`, background:cartCount>0?"#EFF6FF":"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, transition:"all 0.2s" }}>
                🛒
              </div>
              {cartCount > 0 && (
                <div style={{ position:"absolute", top:-6, right:-6, background:C.primary, color:"white", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </div>
              )}
            </div>

            {smUser ? (
              // Logged-in Soul Mates user → show SM Panel trigger instead of auth buttons
              <SoulMatesPanel
                user={smUser}
                onLogout={onSmLogout}
                cartCount={cartCount}
                onOpenCart={() => setCartOpen(true)}
              />
            ) : (
              <>
                <button className="bo login-btn" style={BO} onClick={onLogin}>{t.nav.login}</button>
                <button className="by" style={{...BY,padding:"10px 16px",fontSize:14}} onClick={onRegister}>{t.nav.getStarted} 🐰</button>
              </>
            )}

            {/* Hamburger (mobile) */}
            <button className="show-900" style={{ display:"none", background:"transparent", border:"none", cursor:"pointer", padding:6, flexDirection:"column", gap:5, alignItems:"center", justifyContent:"center" }} onClick={()=>setMobileOpen(true)}>
              <div style={{ width:22, height:2, background:C.primary, borderRadius:2 }}/>
              <div style={{ width:22, height:2, background:C.primary, borderRadius:2 }}/>
              <div style={{ width:22, height:2, background:C.primary, borderRadius:2 }}/>
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar nav — fixed left, desktop only, appears after hero scroll */}
      <FloatingSubNav t={t} page={page} gotoPage={gotoPage} scrollToId={scrollTo} scrolled={scrolled}/>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          <div className="mob-overlay" onClick={()=>setMobileOpen(false)}/>
          <div className="mob-drawer">
            {/* Drawer header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid #E2E8F0" }}>
              <span style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:18, fontWeight:900, color:C.primary }}>🐰 CARTMATES</span>
              <button onClick={()=>setMobileOpen(false)} style={{ background:"transparent", border:"none", fontSize:22, cursor:"pointer", color:C.muted, lineHeight:1 }}>✕</button>
            </div>
            {/* Nav items */}
            <div style={{ flex:1 }}>
              {[
                {l:t.nav.home,       fn:()=>gotoPage("home"),    k:"home"},
                {l:t.nav.services,   fn:()=>scrollTo("services"),k:"svc"},
                {l:t.nav.howItWorks, fn:()=>scrollTo("hiw"),     k:"hiw"},
                {l:t.nav.pricing,    fn:()=>scrollTo("pricing"), k:"price"},
                {l:t.nav.matesMarket,fn:()=>gotoPage("market"),  k:"market"},
                {l:t.nav.matesClub,  fn:()=>gotoPage("club"),    k:"club"},
                {l:t.nav.faq,        fn:()=>scrollTo("faq"),     k:"faq"},
              ].map(item=>(
                <div key={item.k} className={`mob-nl${page===item.k?" act":""}`} onClick={item.fn}>{item.l}</div>
              ))}
            </div>
            {/* Drawer footer: auth + lang */}
            <div style={{ padding:"16px 24px 24px", borderTop:"1px solid #E2E8F0", display:"flex", flexDirection:"column", gap:10 }}>
              {smUser ? (
                // Already logged in → show user card + logout instead of Login/GetStarted
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:`linear-gradient(135deg,${C.primary},${C.action})`, borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🐰</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:"white" }}>{smUser.first_name || smUser.username || "Soul Mate"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontFamily:"monospace" }}>{smUser.smart_id || "—"}</div>
                    </div>
                  </div>
                  <button style={{ background:"#f1f5f9", color:C.muted, border:"none", borderRadius:10, padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }} onClick={()=>{ setMobileOpen(false); onSmLogout?.(); }}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button className="by" style={{...BY,width:"100%",textAlign:"center"}} onClick={()=>{setMobileOpen(false);onRegister();}}>{t.nav.getStarted} 🐰</button>
                  <button className="bo" style={{...BO,width:"100%",textAlign:"center"}} onClick={()=>{setMobileOpen(false);onLogin();}}>{t.nav.login}</button>
                </>
              )}
              {/* Lang list in drawer */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
                {LANGS.map(l=>(
                  <button key={l.key} onClick={()=>setLang(l.key)} style={{ background:lang===l.key?C.primary:"#F1F5F9", color:lang===l.key?"white":C.text, border:"none", borderRadius:8, padding:"6px 12px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════ PAGE: MATES MARKET ═══════════════════════ */}
      {page==="market" && (
        <div style={{ minHeight:"80vh" }}>
          {/* Hero */}
          <div style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"48px 16px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <SectionBadge>{t.market.badge}</SectionBadge>
              <h1 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(28px,6vw,40px)", fontWeight:900, color:"white", marginBottom:10 }}>{t.market.h2}</h1>
              <p style={{ fontSize:15, color:"rgba(255,255,255,0.85)", maxWidth:460, margin:"0 auto 24px", lineHeight:1.7 }}>{t.market.sub}</p>
              <div style={{ maxWidth:420, margin:"0 auto", position:"relative" }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.market.searchPlaceholder} style={{ width:"100%", padding:"13px 18px 13px 44px", borderRadius:14, border:"none", fontSize:15, fontFamily:"inherit", outline:"none" }}/>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:17 }}>🔍</span>
              </div>
            </div>
          </div>
          {/* Categories */}
          <div style={{ background:"white", borderBottom:"1px solid #E2E8F0", padding:"12px 16px" }}>
            <div className="cat-row">
              {t.market.categories.map((cat,i)=>(
                <button key={i} className="cat-pill" onClick={()=>setMktCat(i)} style={{ background:mktCat===i?C.primary:C.bg, color:mktCat===i?"white":C.text, flexShrink:0 }}>{cat}</button>
              ))}
            </div>
          </div>
          {/* Grid */}
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 16px" }}>
            <div className="mkt-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
              {filteredProds.map(p=>(
                <div key={p.id} className="prod-card" style={{ background:"white", borderRadius:16, border:"1.5px solid #E2E8F0", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ background:`linear-gradient(135deg,${C.bg},#E8F4FD)`, height:140, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, position:"relative" }}>
                    {p.img}
                    <span style={{ position:"absolute", top:8, right:8, background:p.stock==="limited"?"#FEF3C7":"#DCFCE7", color:p.stock==="limited"?"#D97706":"#16A34A", fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:7 }}>
                      {p.stock==="limited"?t.market.limitedStock:t.market.inStock}
                    </span>
                  </div>
                  <div style={{ padding:"14px" }}>
                    <div style={{ fontSize:11, color:C.action, fontWeight:800, marginBottom:3 }}>{p.tag}</div>
                    <div style={{ fontSize:13.5, fontWeight:800, color:C.text, marginBottom:4, lineHeight:1.3 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:10 }}>{p.artist} · ⭐{p.rating}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontWeight:900, fontSize:16, color:C.primary }}>฿{p.price}</span>
                      <button className="by" style={{ background: addedId===p.id ? "#22c55e" : C.yellow, color: addedId===p.id ? "white" : C.text, border:"none", borderRadius:9, padding:"7px 12px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", flexShrink:0, transition:"background 0.3s" }} onClick={()=>addToCart(p)}>
                        {addedId===p.id ? "✓ Added!" : t.market.addCart}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProds.length===0 && <div style={{ textAlign:"center", padding:"60px 0", color:C.muted, fontSize:16 }}>🐰 No products found!</div>}
          </div>
        </div>
      )}

      {/* ═══════════════════════ PAGE: MATES CLUB ═══════════════════════ */}
      {page==="club" && (
        <div style={{ minHeight:"80vh" }}>
          <div style={{ background:`linear-gradient(135deg,#1A1A2E,#16213E,${C.primary})`, padding:"48px 16px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)`, backgroundSize:"28px 28px" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <SectionBadge>{t.club.badge}</SectionBadge>
              <h1 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(26px,6vw,40px)", fontWeight:900, color:"white", marginBottom:10 }}>{t.club.h2}</h1>
              <p style={{ fontSize:15, color:"rgba(255,255,255,0.8)", maxWidth:460, margin:"0 auto", lineHeight:1.7 }}>{t.club.sub}</p>
            </div>
          </div>
          <div style={{ background:"white", borderBottom:"1px solid #E2E8F0", padding:"12px 16px" }}>
            <div className="cat-row">
              {t.club.categories.map((cat,i)=>(
                <button key={i} className="cat-pill" onClick={()=>setClubCat(i)} style={{ background:clubCat===i?C.primary:C.bg, color:clubCat===i?"white":C.text, flexShrink:0 }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 16px" }}>
            <div className="news-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 }}>
              {filteredNews.map(n=>{
                const [tagBg,tagColor] = TAG_COLORS[n.tag]||["#F1F5F9","#475569"];
                return (
                  <div key={n.id} className="news-card" style={{ background:"white", borderRadius:16, border:"1.5px solid #E2E8F0", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", position:"relative" }}>
                    {n.hot && <span style={{ position:"absolute", top:12, right:12, background:"#EF4444", color:"white", fontSize:11, fontWeight:800, padding:"3px 8px", borderRadius:7 }}>🔥 HOT</span>}
                    <div style={{ background:`linear-gradient(135deg,${C.bg},#E8F4FD)`, height:120, display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>{n.img}</div>
                    <div style={{ padding:"16px" }}>
                      <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center", flexWrap:"wrap" }}>
                        <span style={{ background:tagBg, color:tagColor, fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:7 }}>{n.tag}</span>
                        <span style={{ fontSize:11, color:C.muted }}>{n.date}</span>
                      </div>
                      <div style={{ fontWeight:800, fontSize:14.5, color:C.text, marginBottom:7, lineHeight:1.4 }}>{n.title}</div>
                      <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:12 }}>{n.desc.substring(0,110)}...</div>
                      <span style={{ color:C.action, fontWeight:800, fontSize:13 }}>{t.club.readMore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ PAGE: SERVICES ════════════════════════ */}
      {page==="services" && <ServicesPage t={t} gotoPage={gotoPage}/>}

      {/* ═══════════════════════ PAGE: HOW IT WORKS ════════════════════ */}
      {page==="howItWorks" && <HowItWorksPage t={t} onRegister={onRegister} gotoPage={gotoPage} BY={BY}/>}

      {/* ═══════════════════════ PAGE: PRICING ═════════════════════════ */}
      {page==="pricing" && <PricingPage t={t} onRegister={onRegister} gotoPage={gotoPage} BY={BY}/>}

      {/* ═══════════════════════ PAGE: HOME ═══════════════════════════════ */}
      {page==="home" && (<>

        {/* ── HERO ── */}
        <section style={{ background:C.action, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:350, height:350, borderRadius:"50%", background:"rgba(255,255,255,0.08)", filter:"blur(50px)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", bottom:-60, left:-60, width:300, height:300, borderRadius:"50%", background:`${C.yellow}18`, filter:"blur(50px)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)`, backgroundSize:"30px 30px", pointerEvents:"none" }}/>

          <div className="hero-inner" style={{ maxWidth:1200, margin:"0 auto", padding:"64px 24px 80px", display:"flex", alignItems:"center", gap:48, position:"relative", zIndex:1 }}>
            {/* Text */}
            <div style={{ flex:1 }}>
              <div className="fu" style={{ marginBottom:14 }}>
                <span style={{ background:"rgba(255,255,255,0.18)", backdropFilter:"blur(8px)", color:"white", fontWeight:800, fontSize:13, padding:"5px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,0.25)", display:"inline-block" }}>{t.hero.badge}</span>
              </div>
              <h1 className="fu1 hero-h1" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(36px,5.5vw,54px)", fontWeight:900, lineHeight:1.1, color:"white", marginBottom:18, letterSpacing:"-0.02em" }}>
                {t.hero.h1a}<br/>
                <span style={{ color:C.yellow }}>{t.hero.h1b}</span><br/>
                {t.hero.h1c}
              </h1>
              <p className="fu2 hero-sub" style={{ fontSize:"clamp(14px,2vw,17px)", color:"rgba(255,255,255,0.88)", lineHeight:1.8, marginBottom:28, maxWidth:480 }}>{t.hero.sub}</p>
              <div className="fu3 hero-cta" style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:36 }}>
                <button className="by" style={{...BY,padding:"13px 28px",fontSize:15}} onClick={onRegister}>{t.hero.cta1}</button>
                <button className="bw" style={{ background:"rgba(255,255,255,0.15)", backdropFilter:"blur(6px)", color:"white", border:"2px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"13px 28px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }} onClick={()=>scrollTo("hiw")}>{t.hero.cta2}</button>
              </div>
              <div className="fu4 hero-trust" style={{ display:"flex", gap:18, flexWrap:"wrap" }}>
                {t.hero.trust.map(b=>(
                  <div key={b} style={{ display:"flex", alignItems:"center", gap:7, color:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:700 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:C.yellow, display:"inline-block" }}/>{b}
                  </div>
                ))}
              </div>
            </div>
            {/* Rabbit */}
            <div className="hero-rabbit" style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div className="rabbit-anim" style={{ filter:"drop-shadow(0 16px 36px rgba(0,0,0,0.2))" }}>
                <Rabbit size={260}/>
              </div>
            </div>
          </div>

          {/* Stats bar (absolute bottom of hero) */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.18)", backdropFilter:"blur(8px)", padding:"10px 16px" }}>
            <div className="stats-row" style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:4, justifyContent:"center" }}>
              {t.stats.map(s=>(
                <div key={s.l} className="stat-card" style={{ display:"flex", alignItems:"center", gap:8, color:"white", padding:"6px 14px" }}>
                  <span className="stat-ico" style={{ fontSize:18 }}>{s.e}</span>
                  <div>
                    <div className="stat-num" style={{ fontSize:20, fontWeight:900, lineHeight:1 }}>{s.n}</div>
                    <div className="stat-lbl" style={{ fontSize:11, opacity:0.85, fontWeight:600 }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Spacer for stats bar */}
          <div style={{ height:60 }}/>
        </section>

        {/* ── MARQUEE TICKER ── */}
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...t.marquee,...t.marquee].map((item,i)=>(
              <span key={i} className="ticker-item">
                {item}<span style={{ color:C.yellow, margin:"0 4px" }}>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── TOP 10 CAROUSEL ── */}
        <Top10Carousel t={t} onRegister={onRegister} gotoPage={gotoPage} BY={BY}/>

        {/* ── WHAT'S COMING NEXT ── */}
        <section className="sec-pad" style={{ padding:"64px 24px", background:C.bg }}>
          <div style={{ maxWidth:1280, margin:"0 auto" }}>
            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <SectionBadge>{t.upcoming.badge}</SectionBadge>
              <h2 className="sec-h2" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(26px,5vw,38px)", fontWeight:900, color:C.text, marginBottom:8 }}>{t.upcoming.h2}</h2>
              <p style={{ fontSize:15, color:C.muted, maxWidth:420, margin:"0 auto" }}>{t.upcoming.sub}</p>
            </div>

            {/* 2-col layout: articles (left) + featured image (right) */}
            <div className="upcoming-layout" style={{ display:"grid", gridTemplateColumns:"1fr clamp(220px,32%,380px)", gap:24, alignItems:"start" }}>

              {/* LEFT — article list */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {NEWS.slice(0,5).map(n=>{
                  const [tagBg,tagColor] = TAG_COLORS[n.tag]||["#F1F5F9","#475569"];
                  return (
                    <div key={n.id} className="article-row" style={{ background:"white", borderRadius:14, border:"1.5px solid #E2E8F0", padding:"16px 18px", cursor:"pointer", transition:"all 0.22s", boxShadow:"0 2px 6px rgba(0,0,0,0.04)", position:"relative", display:"flex", gap:14, alignItems:"flex-start" }}>
                      {/* Emoji icon */}
                      <div style={{ width:44, height:44, borderRadius:10, background:`linear-gradient(135deg,${C.bg},#E8F4FD)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{n.img}</div>

                      {/* Text */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:7, marginBottom:5, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ background:tagBg, color:tagColor, fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:6 }}>{n.tag}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{n.date}</span>
                          {n.hot && <span style={{ background:"#EF4444", color:"white", fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:6 }}>🔥 HOT</span>}
                        </div>
                        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:4, lineHeight:1.4, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{n.title}</div>
                        <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{n.desc}</div>
                        <span style={{ color:C.action, fontWeight:800, fontSize:12, display:"inline-block", marginTop:6 }}>{t.upcoming.readMore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — featured image panel */}
              <div className="upcoming-img-panel" style={{ position:"sticky", top:80 }}>
                <div style={{ background:"white", borderRadius:18, border:"1.5px solid #E2E8F0", overflow:"hidden", boxShadow:"0 4px 20px rgba(7,91,176,0.1)" }}>
                  {/* Image placeholder */}
                  <div style={{ width:"100%", aspectRatio:"4/3", background:`linear-gradient(145deg,${C.primary}18,${C.action}28)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                    {/* Decorative pattern */}
                    <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(${C.primary}15 1.5px,transparent 1.5px)`, backgroundSize:"20px 20px" }}/>
                    <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
                      <div style={{ fontSize:52, marginBottom:10 }}>🖼️</div>
                      <div style={{ color:C.primary, fontWeight:800, fontSize:13 }}>Featured Image</div>
                      <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>Upload your banner here</div>
                    </div>
                    {/* HOT badge overlay */}
                    <div style={{ position:"absolute", top:12, left:12, background:C.yellow, color:C.text, fontWeight:900, fontSize:11, padding:"4px 11px", borderRadius:10 }}>
                      🌟 Featured
                    </div>
                  </div>
                  {/* Caption area */}
                  <div style={{ padding:"16px 18px" }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.text, marginBottom:6 }}>
                      {NEWS[0].title}
                    </div>
                    <div style={{ fontSize:13, color:C.muted, lineHeight:1.65, marginBottom:12 }}>
                      {NEWS[0].desc.substring(0,100)}...
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ background:TAG_COLORS[NEWS[0].tag]?.[0]||"#F1F5F9", color:TAG_COLORS[NEWS[0].tag]?.[1]||"#475569", fontSize:11, fontWeight:800, padding:"3px 9px", borderRadius:7 }}>{NEWS[0].tag}</span>
                      <span style={{ color:C.action, fontWeight:800, fontSize:13, cursor:"pointer" }}>{t.upcoming.readMore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign:"center", marginTop:28 }}>
              <button className="by" style={{...BY,padding:"12px 32px"}} onClick={()=>gotoPage("club")}>{t.nav.matesClub} — See All →</button>
            </div>
          </div>
        </section>

        {/* ── WHY CHOOSE CARTMATES ── */}
        <WhyCartMates t={t} onRegister={onRegister} BY={BY}/>

        {/* ── SERVICES (preview + link to full page) ── */}
        <section id="services" className="sec-pad" style={{ padding:"56px 24px", background:"white" }}>
          <div style={{ maxWidth:1200, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
              <div>
                <SectionBadge>{t.services.badge}</SectionBadge>
                <h2 className="sec-h2" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.text, margin:0 }}>
                  {t.services.h2a} <span className="gt">{t.services.h2b}</span>
                </h2>
              </div>
              <button onClick={()=>gotoPage("services")} style={{ background:"transparent", border:`2px solid ${C.primary}`, color:C.primary, borderRadius:10, padding:"9px 20px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}
                onMouseEnter={e=>{e.target.style.background=C.primary;e.target.style.color="white";}}
                onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=C.primary;}}>
                View All Services →
              </button>
            </div>
            {/* Compact 3-col grid on mobile → icon + title only style */}
            <div className="svc-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
              {t.services.items.map((s,i)=>{
                const cols=[C.action,C.primary,"#7C3AED","#059669","#DC2626","#D97706"];
                return <ServiceCard key={i} icon={s.icon} title={s.title} desc={s.desc} color={cols[i%cols.length]}/>;
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (preview + link) ── */}
        <section id="hiw" className="sec-pad" style={{ padding:"56px 24px", background:C.bg }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
              <div>
                <SectionBadge>{t.howItWorks.badge}</SectionBadge>
                <h2 className="sec-h2" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.text, margin:0 }}>
                  {t.howItWorks.h2a} <span className="gt">{t.howItWorks.h2b}</span>
                </h2>
              </div>
              <button onClick={()=>gotoPage("howItWorks")} style={{ background:"transparent", border:`2px solid ${C.primary}`, color:C.primary, borderRadius:10, padding:"9px 20px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}
                onMouseEnter={e=>{e.target.style.background=C.primary;e.target.style.color="white";}}
                onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=C.primary;}}>
                Learn More →
              </button>
            </div>
            <div className="steps-row" style={{ display:"flex", gap:0, position:"relative" }}>
              <div className="step-conn" style={{ position:"absolute", top:25, left:"12%", right:"12%", height:2, background:`linear-gradient(90deg,${C.yellow},${C.action})`, zIndex:0 }}/>
              {t.howItWorks.steps.map((s,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"0 10px", position:"relative", zIndex:1 }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:C.yellow, border:"4px solid white", boxShadow:`0 4px 16px ${C.yellow}77`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, fontWeight:900, marginBottom:16, color:C.text }}>{s.n}</div>
                  <div style={{ background:"white", borderRadius:16, padding:"18px 14px", boxShadow:"0 4px 18px rgba(0,0,0,0.07)", width:"100%" }}>
                    <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:6 }}>{s.t}</div>
                    <div style={{ fontSize:12.5, color:C.muted, lineHeight:1.6 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING (preview + link) ── */}
        <section id="pricing" className="sec-pad" style={{ padding:"56px 24px", background:"white" }}>
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:12 }}>
              <div>
                <SectionBadge>{t.pricing.badge}</SectionBadge>
                <h2 className="sec-h2" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:C.text, margin:0 }}>
                  {t.pricing.h2a} <span className="gt">{t.pricing.h2b}</span>
                </h2>
              </div>
              <button onClick={()=>gotoPage("pricing")} style={{ background:"transparent", border:`2px solid ${C.primary}`, color:C.primary, borderRadius:10, padding:"9px 20px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}
                onMouseEnter={e=>{e.target.style.background=C.primary;e.target.style.color="white";}}
                onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=C.primary;}}>
                See Full Pricing →
              </button>
            </div>
            <div className="pkg-grid" style={{ display:"flex", gap:20, justifyContent:"center", alignItems:"flex-start", flexWrap:"wrap" }}>
              {PACKAGES.map(pkg=>{
                const isP = pkg.id==="premium";
                const isU = pkg.id==="ultimate";
                return (
                  <div key={pkg.id} className={`pkg-card${isP?" pkg-pop":""}`} style={{ width:"min(310px,100%)", borderRadius:20, border:`2.5px solid ${pkg.color}`, overflow:"hidden", background:"white", position:"relative", boxShadow:isP?`0 18px 55px ${pkg.color}28`:isU?`0 12px 36px rgba(7,91,176,0.18)`:"0 4px 18px rgba(0,0,0,0.07)" }}>
                    {pkg.badge && <div style={{ position:"absolute", top:12, right:12, background:C.yellow, color:C.text, fontWeight:900, fontSize:11, padding:"4px 11px", borderRadius:16 }}>{pkg.badge}</div>}
                    <div style={{ background:pkg.headerBg, padding:"24px 22px 20px", color:"white" }}>
                      <div style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:26, fontWeight:900, marginBottom:6 }}>{pkg.name}</div>
                      <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                        <span style={{ fontSize:38, fontWeight:900, lineHeight:1 }}>฿{pkg.price.toLocaleString()}</span>
                        <span style={{ fontSize:13, opacity:0.8 }}>/mo</span>
                      </div>
                    </div>
                    <div style={{ padding:"18px 22px" }}>
                      {pkg.features.map((f,fi)=>(
                        <div key={fi} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"5px 0", borderBottom:"1px solid #F1F5F9" }}>
                          <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>{f.ok?"✅":"❌"}</span>
                          <span style={{ fontSize:13, color:f.ok?C.text:"#94A3B8", lineHeight:1.4 }}>{f.t}{f.note&&<span style={{color:C.action,fontWeight:800}}> *</span>}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"0 22px 22px" }}>
                      <button className="by" style={{...BY,width:"100%",padding:"13px"}} onClick={onRegister}>{t.pricing.cta} {pkg.name} →</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ textAlign:"center", marginTop:24, color:C.muted, fontSize:12.5 }}>{t.pricing.note}</p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="sec-pad" style={{ padding:"64px 24px", background:C.bg }}>
          <div style={{ maxWidth:740, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:40 }}>
              <SectionBadge>{t.faq.badge}</SectionBadge>
              <h2 className="sec-h2" style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,5vw,36px)", fontWeight:900, color:C.text }}>{t.faq.h2}</h2>
            </div>
            {t.faq.items.map((item,i)=><FaqItem key={i} q={item.q} a={item.a}/>)}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="sec-pad" style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"64px 24px", textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-40, left:"50%", transform:"translateX(-50%)", width:500, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.06)", filter:"blur(40px)" }}/>
          <div style={{ position:"relative", zIndex:1, maxWidth:520, margin:"0 auto" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🐰</div>
            <h2 style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:"clamp(24px,5vw,36px)", fontWeight:900, color:"white", marginBottom:12 }}>{t.ctaBanner.h2}</h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,0.85)", marginBottom:28, lineHeight:1.7 }}>{t.ctaBanner.sub}</p>
            <div className="cta-btns" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="by" style={{...BY,padding:"14px 32px",fontSize:15}} onClick={onRegister}>{t.ctaBanner.btn1}</button>
              <button className="bw" style={{ background:"rgba(255,255,255,0.14)", color:"white", border:"2px solid rgba(255,255,255,0.35)", borderRadius:12, padding:"14px 32px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }} onClick={onLogin}>{t.ctaBanner.btn2}</button>
            </div>
          </div>
        </section>
      </>)}

      {/* ═══════════════════════ FOOTER ═══════════════════════════════════ */}
      <footer style={{ background:C.dark, color:"rgba(255,255,255,0.7)", padding:"44px 20px 24px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="footer-inner" style={{ display:"flex", gap:44, marginBottom:36, flexWrap:"wrap" }}>
            <div style={{ flex:"1 1 220px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🐰</div>
                <span style={{ fontFamily:"'Baloo 2',sans-serif", fontSize:18, fontWeight:900, color:"white" }}>CARTMATES</span>
              </div>
              <p style={{ fontSize:13, lineHeight:1.8, maxWidth:240 }}>{t.footer.tagline}</p>
            </div>
            {t.footer.cols.map((col,i)=>(
              <div key={i} style={{ flex:"1 1 120px" }}>
                <div style={{ color:"white", fontWeight:800, marginBottom:12, fontSize:13 }}>{col.title}</div>
                {col.links.map(l=>(
                  <div key={l} style={{ fontSize:13, marginBottom:8, cursor:"pointer", transition:"color 0.2s" }}
                    onMouseEnter={e=>e.target.style.color=C.yellow}
                    onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.7)"}
                  >{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)", paddingTop:18, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:12.5 }}>{t.footer.copy}</div>
            <div style={{ display:"flex", gap:18, fontSize:12.5, flexWrap:"wrap" }}>
              {t.footer.legal.map(l=><span key={l} style={{ cursor:"pointer" }}>{l}</span>)}
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════ CHECKOUT PAGE (full screen) ═══════════════════ */}
      {checkoutOpen && smUser && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, overflow: "auto" }}>
          <CheckoutPage
            user={smUser}
            cart={cart}
            onCancel={() => setCheckoutOpen(false)}
            onSuccess={(orderNo) => {
              setCheckoutOpen(false);
              setConfirmedOrderNo(orderNo);
            }}
            onClearCart={clearCartAfterOrder}
          />
        </div>
      )}

      {/* ═══════════════════ ORDER CONFIRMATION ═════════════════════════════ */}
      {confirmedOrderNo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 700 }}>
          <OrderConfirmation
            orderNo={confirmedOrderNo}
            user={smUser}
            onBackToShop={() => setConfirmedOrderNo(null)}
            onViewOrders={() => {
              setConfirmedOrderNo(null);
              // SoulMatesPanel auto-opens on its own trigger;
              // user can click avatar to open "My Orders" tab.
            }}
          />
        </div>
      )}

      {/* ═══════════════════ CART DRAWER ══════════════════════════════════ */}
      {cartOpen && (
        <>
          <div onClick={()=>setCartOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(10,22,40,0.35)", zIndex:400, animation:"fadeIn 0.2s ease" }}/>
          <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(380px,95vw)", background:"white", zIndex:401, display:"flex", flexDirection:"column", boxShadow:"-8px 0 48px rgba(0,0,0,0.18)", borderRadius:"20px 0 0 20px", animation:"slideFromRight 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
            <style>{`@keyframes slideFromRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"20px 24px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
              <span style={{ fontSize:22 }}>🛒</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:17, color:"white" }}>My Cart</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:1 }}>{cartCount} {cartCount===1?"item":"items"}</div>
              </div>
              <div onClick={()=>setCartOpen(false)} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"white", cursor:"pointer" }}>✕</div>
            </div>

            {/* Cart items */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
              {cart.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
                  <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:6 }}>Your cart is empty</div>
                  <div style={{ fontSize:13 }}>Browse the Mates Market and add some items!</div>
                  <button onClick={()=>{ setCartOpen(false); gotoPage("market"); }} style={{ marginTop:20, background:C.yellow, color:C.text, border:"none", borderRadius:10, padding:"10px 24px", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                    Browse Market →
                  </button>
                </div>
              ) : cart.map(item => (
                <div key={item.id} style={{ background:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:14, padding:"14px", display:"flex", gap:12, alignItems:"center" }}>
                  <div style={{ width:48, height:48, borderRadius:10, background:`linear-gradient(135deg,${C.bg},#E8F4FD)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{item.img}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:C.action, fontWeight:800, marginBottom:2 }}>{item.tag}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, lineHeight:1.3, marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{item.name}</div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontWeight:900, fontSize:15, color:C.primary }}>฿{(item.price * item.qty).toLocaleString()}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button onClick={()=>updateQty(item.id,-1)} style={{ width:26, height:26, borderRadius:7, border:`1.5px solid #E2E8F0`, background:"white", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:C.text }}>−</button>
                        <span style={{ fontWeight:800, fontSize:14, minWidth:20, textAlign:"center" }}>{item.qty}</span>
                        <button onClick={()=>updateQty(item.id,1)} style={{ width:26, height:26, borderRadius:7, border:`1.5px solid #E2E8F0`, background:"white", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, color:C.text }}>+</button>
                        <button onClick={()=>removeFromCart(item.id)} style={{ width:26, height:26, borderRadius:7, border:"none", background:"#FEE2E2", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#DC2626", marginLeft:2 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding:"16px 20px", borderTop:"1px solid #E2E8F0", flexShrink:0, background:"white" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:C.muted }}>Total ({cartCount} items)</span>
                  <span style={{ fontWeight:900, fontSize:20, color:C.primary }}>฿{cartTotal.toLocaleString()}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:12, textAlign:"center" }}>⚠️ Shipping cost calculated at checkout</div>
                <button onClick={handleCheckout} style={{ width:"100%", background:`linear-gradient(135deg,${C.primary},${C.action})`, color:"white", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>
                  Proceed to Checkout →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ LOGIN GATE MODAL ════════════════════════════════ */}
      {loginGateOpen && (
        <>
          <div onClick={()=>setLoginGateOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(10,22,40,0.5)", zIndex:500, backdropFilter:"blur(4px)", animation:"fadeIn 0.2s ease" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:501, background:"white", borderRadius:24, width:"min(420px,92vw)", overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,0.35)", animation:"scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <style>{`@keyframes scaleIn{from{transform:translate(-50%,-50%) scale(0.88);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}`}</style>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${C.primary},${C.action})`, padding:"28px 28px 24px", textAlign:"center", position:"relative" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>🐰</div>
              <div style={{ fontWeight:900, fontSize:20, color:"white", marginBottom:4 }}>Almost there!</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.8)", lineHeight:1.5 }}>Sign in or create an account to complete your purchase</div>
              <button onClick={()=>setLoginGateOpen(false)} style={{ position:"absolute", top:16, right:16, width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", color:"white", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* Cart summary */}
            <div style={{ padding:"16px 24px", background:"#F8FAFC", borderBottom:"1px solid #E2E8F0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, color:C.muted, fontWeight:700 }}>🛒 {cartCount} item{cartCount!==1?"s":""} in cart</div>
                <div style={{ fontWeight:900, fontSize:16, color:C.primary }}>฿{cartTotal.toLocaleString()}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:12 }}>
              <button onClick={()=>{ setLoginGateOpen(false); onLogin(); }} style={{ width:"100%", background:`linear-gradient(135deg,${C.primary},${C.action})`, color:"white", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>
                Log In to Checkout →
              </button>
              <button onClick={()=>{ setLoginGateOpen(false); onRegister(); }} style={{ width:"100%", background:C.yellow, color:C.text, border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>
                Create Free Account 🎉
              </button>
              <button onClick={()=>{ setLoginGateOpen(false); setCartOpen(true); }} style={{ width:"100%", background:"transparent", color:C.muted, border:`1.5px solid #E2E8F0`, borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                ← Back to Cart
              </button>
            </div>

            <div style={{ padding:"0 28px 20px", textAlign:"center", fontSize:12, color:C.muted }}>
              Your cart items will be saved after you log in 🐰
            </div>
          </div>
        </>
      )}

    </div>
  );
}

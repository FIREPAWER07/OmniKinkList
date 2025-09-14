# 🌐 Kink List Data Structure (`Shared.js`)

This document explains how the kink list data is structured and how to add new kinks to the system.

---

## 📖 Overview

The code contains a structured list of **kinks and preferences** organized into categories.
Each category has a description, and each kink item can have:

* ✍️ **Descriptions**
* 🔀 **Preference options** (e.g., "Giving / Receiving")

---

## ⚙️ How It Works

1. **📂 Category Explanations**
   The `categoryExplanations` object provides descriptions for each category so users know what belongs there.

2. **🗂️ Kink List Data**
   The `kinklistData` object contains **three versions** of the kink list:

   * 🟢 `classic`
   * 🔵 `detailed`
   * 🔴 `extended`
     Same structure, different levels of detail.

3. **🧩 Parser Function**
   The `parseKinkListData()` function processes the text-based kink list format and converts it into a structured JavaScript object.

---

## 🙋 Simple Explanation: How to Add Kinks

If you **can’t code** but want a new kink added, ask a developer and provide:

1. **📂 The right category**
   Decide which category your kink belongs in.

2. **📝 Follow the format**

   ```
   * Kink Name
   ? Description of what this kink involves.
   ```

3. **🔀 Add preference options (if needed)**

   ```
   @ Giving,Receiving
   ```

---

## 🧑‍💻 Detailed Explanation: How to Add Kinks

1. **Locate the category** in `kinklistData` (classic, detailed, or extended).
2. **Add your kink** using the proper format:

   ```
   * Your New Kink Name
   ? Description of the new kink.
   ```
3. **Add preferences (optional)** with `@`:

   ```
   @ Giving,Receiving
   ```
4. **Update all three versions** if you want consistency.

---

### ✨ Example: Adding a New Kink

📂 Inside the **General** category of each kinklistData version:

```
* Example Kink
? This is a description of the new example kink.
@ Giving,Receiving
```

---

### 🆕 Example: Adding a New Category

1. Add a category explanation:

```js
const categoryExplanations = {
  // ... existing categories ...
  "New Category": "Description of what this new category contains.",
};
```

2. Add the category to `kinklistData`:

```
#New Category
* First kink in new category
? Description of first kink.
@ Option1,Option2

* Second kink in new category
? Description of second kink.
```

---

## 🏗️ Data Structure Details

* 📂 **Categories** → `#Category Name`
* ⭐ **Kinks** → `* Kink Name`
* 📝 **Descriptions** → `? Description text`
* 🔀 **Preferences** → `@ Option1,Option2,...`

➡️ The parser turns preferences into labeled choices (e.g., **Spanking (Giving)**, **Spanking (Receiving)**).

---

## ⚠️ Important Notes

⚡ Keep everything consistent:

* Use the right markers (`*`, `?`, `@`)
* Keep descriptions clear & concise ✍️
* Place kinks in the most fitting category 📂
* If a kink has no preferences → skip the `@` line

---

## 🧾 Developer Cheatsheet

Quick template for a new kink (ready to copy-paste):

```
* Kink Name
? Short but clear description here.
@ Giving,Receiving
```

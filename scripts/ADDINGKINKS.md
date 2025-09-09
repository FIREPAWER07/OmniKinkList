# Kink List Data Structure

This document explains how the kink list data is structured and how to add new kinks to the system.

---

## Overview

The code contains a structured list of kinks and preferences organized into categories. Each category has a description, and each kink item can have additional information like descriptions and dual preference options (e.g., "Giving/Receiving").

---

## How It Works

1. **Category Explanations**  
   The `categoryExplanations` object provides descriptions for each category to help users understand what types of kinks belong there.

2. **Kink List Data**  
   The `kinklistData` object contains three versions of the kink list (classic, detailed, extended) with the same structure but potentially different content.

3. **Parser Function**  
   The `parseKinkListData()` function processes the text-based kink list format and converts it into a structured JavaScript object that can be used by the application.

---

## For Non-Programmers: How to Add Kinks

If you can't code but need to add a kink, you would need to ask a developer to make these changes:

1. **Find the right category**  
   Look through the categories to find where your new kink should belong.

2. **Follow the format**  
   New kinks must follow this exact pattern:
```
   * Kink Name
   ? Description of what this kink involves.
```

3. **Consider dual preferences**
   If the kink has options like "Giving/Receiving" or "Self/Partner", it needs to be placed under a subcategory header like `(Giving, Receiving)`.

---

## For Programmers: How to Add Kinks

1. **Locate the appropriate category** in the `kinklistData` object (classic, detailed, or extended versions).

2. **Add your kink** using the proper format:

```
   * Your New Kink Name
   ? Description of the new kink.
```

3. **For dual-preference kinks**, make sure they're under the appropriate subcategory header like `(Giving, Receiving)`.

4. **Update all three versions** (classic, detailed, extended) if you want consistency across all kink list types.

### Example: Adding a New Kink

To add a new kink "Example Kink" to the "General" category:


// In the General section of each kinklistData version:
* Example Kink
? This is a description of the new example kink.

### Example: Adding a New Category

1. First add a category explanation:

```
const categoryExplanations = {
  // ... existing categories ...
  "New Category": "Description of what this new category contains.",
};
```

2. Then add the category to the `kinklistData`:

```
#New Category
(Optional Subcategory)
* First kink in new category
? Description of first kink.
* Second kink in new category
? Description of second kink.
```

---

## Data Structure Details

* Categories are marked with `#Category Name`
* Subcategories are in parentheses: `(Subcategory Name)`
* Kinks are marked with `* Kink Name`
* Descriptions are marked with `? Description text`

The parser automatically detects dual-preference kinks based on subcategory names and creates appropriate labels for them.

---

## Important Notes

* Maintain consistent formatting with asterisks and question marks
* Keep descriptions clear and concise
* Place kinks in the most appropriate category

---

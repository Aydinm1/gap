export async function openAssignmentEditor(page, assignmentId, section = 'Details') {
  await page.getByRole('navigation', { name: 'Week sections', exact: true }).getByRole('button', { name: /^Assignments/ }).click();
  const select = page.getByRole('combobox', { name: 'Select assignment', exact: true, includeHidden: true });
  // The native selector remains in the DOM at desktop sizes; its option order is
  // the same as the keyboard-accessible assignment list.
  if (await select.isVisible()) await select.selectOption(assignmentId);
  else {
    const index = await select.locator('option').evaluateAll((options, id) => options.findIndex(option => option.value === id), assignmentId);
    if (index < 0) throw new Error('Fixture assignment missing from editor');
    await page.getByRole('navigation', { name: 'Select assignment', exact: true }).getByRole('button').nth(index).click();
  }
  await page.getByRole('navigation', { name: 'Assignment sections', exact: true }).getByRole('button', { name: section, exact: true }).click();
}

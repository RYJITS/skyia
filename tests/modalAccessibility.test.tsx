// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EndGameReport from '../components/EndGameReport';
import InstallGuideModal from '../components/InstallGuideModal';

describe('Skyia modal accessibility', () => {
  it('exposes the install guide as a modal dialog with a title', () => {
    render(<InstallGuideModal isOpen onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'INSTALLATION PROTOCOL' })).toBeInTheDocument();
  });

  it('exposes the end-game report as a modal dialog with its mission title', () => {
    render(
      <EndGameReport
        status="VICTORY"
        analysis={{ threatLevel: 12, status: 'STABLE', log: [] }}
        turnCount={4}
        finalMessage="Transmission complete."
        onRestart={() => {}}
        onExport={async () => {}}
      />
    );

    expect(screen.getByRole('dialog', { name: 'MISSION ACCOMPLIE' })).toBeInTheDocument();
  });
});

import 'package:flutter/material.dart';
import 'legal_screens.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  void _open(BuildContext context, Widget page) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
  }
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Settings', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ListTile(title: const Text('Privacy Policy'), onTap: () => _open(context, const LegalPage('Privacy Policy', 'assets/legal/privacy.md'))),
        ListTile(title: const Text('Terms of Service'), onTap: () => _open(context, const LegalPage('Terms of Service', 'assets/legal/terms.md'))),
        ListTile(title: const Text('General Advice & Risk Disclaimer'), onTap: () => _open(context, const LegalPage('Disclaimer', 'assets/legal/disclaimer.md'))),
        ListTile(title: const Text('About'), onTap: () => _open(context, const LegalPage('About', 'assets/legal/about.md'))),
        ListTile(title: const Text('Contact'), onTap: () => _open(context, const LegalPage('Contact', 'assets/legal/contact.md'))),
        const SizedBox(height: 16),
        const Text('Not financial advice. Investing involves risk.', textAlign: TextAlign.center),
      ],
    );
  }
}
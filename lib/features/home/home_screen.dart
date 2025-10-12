import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        _Card('Next Order Plan', 'Balanced 70/30 • $50 Friday • Drift-aware split'),
        SizedBox(height: 12),
        _Card('Right Now Tilt', 'Macro stress → +$10 to Safety (VAF/GOLD)'),
        SizedBox(height: 12),
        _Gov(),
      ],
    );
  }
}
class _Card extends StatelessWidget {
  final String title, subtitle;
  const _Card(this.title, this.subtitle);
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(subtitle),
        ]),
      ),
    );
  }
}
class _Gov extends StatelessWidget {
  const _Gov();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
      child: const Text('All providers governed equally · No favorites', textAlign: TextAlign.center),
    );
  }
}
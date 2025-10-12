
import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        _NextOrderCard(),
        SizedBox(height: 12),
        _RightNowTiltCard(),
        SizedBox(height: 12),
        _GovBanner(),
      ],
    );
  }
}

class _NextOrderCard extends StatelessWidget {
  const _NextOrderCard();
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: const [
            Text('Next Order Plan', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            SizedBox(height: 6),
            Text('Balanced 70/30 • $50 this Friday • Drift-aware split'),
          ],
        ),
      ),
    );
  }
}

class _RightNowTiltCard extends StatelessWidget {
  const _RightNowTiltCard();
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: const [
            Text('Right Now Tilt', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            SizedBox(height: 6),
            Text('Macro stress elevated → route +$10 to Safety (VAF/GOLD)'),
          ],
        ),
      ),
    );
  }
}

class _GovBanner extends StatelessWidget {
  const _GovBanner();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
      child: const Text(
        'All providers governed equally · No favorites · No commissions influence allocation',
        textAlign: TextAlign.center,
      ),
    );
  }
}

import 'package:flutter/material.dart';

class PortfolioScreen extends StatelessWidget {
  const PortfolioScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('Portfolio', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        SizedBox(height: 8),
        Text('Growth vs Safety pie (placeholder)'),
        SizedBox(height: 8),
        Text('Planned buys per rules'),
      ],
    );
  }
}